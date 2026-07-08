"use client";

import {
  Profiler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ProfilerOnRenderCallback,
} from "react";
import Link from "next/link";
import { ArrowLeft, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import type { UIMessage } from "ai";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThrottledStreamContent } from "@/hooks/useThrottledStreamContent";
import {
  STREAM_PACED_INTERVALS,
  STREAM_RENDER_MODES,
  STREAM_UPDATE_MODES,
  effectiveStreamUpdateMode,
  type StreamPacedIntervalMs,
  type StreamRenderMode,
  type StreamUpdateMode,
} from "@/lib/streaming-display";
import {
  clearStreamingDebugEvents,
  getStreamingDebugEvents,
  isStreamingDebugEnabled,
  setStreamingDebugEnabled,
  subscribeStreamingDebug,
  type StreamingDebugEvent,
} from "@/lib/streaming-debug";

const SAMPLE_STREAM_TEXT = `# Streaming diagnostics

This page helps profile streaming behavior across:

- plain text streaming
- markdown block parsing
- streamdown rendering

## Stress text

### Lists
1. Alpha
2. Beta
3. Gamma

### Table
| A | B | C |
| - | - | - |
| 1 | 2 | 3 |
| 4 | 5 | 6 |

### Code
\`\`\`ts
export function expensiveThing(input: string) {
  return input.split("\\n").map((line, index) => \`\${index}: \${line}\`).join("\\n");
}
\`\`\`

### Math
Inline: \`x^2 + y^2\`

## Long text

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque venenatis,
sem vel porta ultrices, turpis magna blandit lectus, id vulputate nisi eros id
est. Sed at metus eget tortor efficitur feugiat. Integer tempor tincidunt nunc,
in dapibus turpis sagittis ac.
`;

type CommitMetrics = {
  commits: number;
  averageMs: number;
  p95Ms: number;
  maxMs: number;
  over16Ms: number;
  over33Ms: number;
  lastMs: number;
  lastCommitGapMs: number;
};

function summarizeDurations(durations: number[]): CommitMetrics {
  if (durations.length === 0) {
    return {
      commits: 0,
      averageMs: 0,
      p95Ms: 0,
      maxMs: 0,
      over16Ms: 0,
      over33Ms: 0,
      lastMs: 0,
      lastCommitGapMs: 0,
    };
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const p95Index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * 0.95) - 1),
  );
  const over16Ms = durations.filter((value) => value > 16.7).length;
  const over33Ms = durations.filter((value) => value > 33.3).length;
  const total = durations.reduce((sum, value) => sum + value, 0);
  return {
    commits: durations.length,
    averageMs: total / durations.length,
    p95Ms: sorted[p95Index] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
    over16Ms,
    over33Ms,
    lastMs: durations[durations.length - 1] ?? 0,
    lastCommitGapMs: 0,
  };
}

export default function StreamingDiagnosticsPage() {
  const [renderMode, setRenderMode] = useState<StreamRenderMode>("streamdown");
  const [updateMode, setUpdateMode] = useState<StreamUpdateMode>("smooth");
  const [pacedIntervalMs, setPacedIntervalMs] = useState<StreamPacedIntervalMs>(50);
  const [chunkSize, setChunkSize] = useState(18);
  const [chunkIntervalMs, setChunkIntervalMs] = useState(25);
  const [sourceText, setSourceText] = useState(SAMPLE_STREAM_TEXT);
  const [streamingIndex, setStreamingIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<StreamingDebugEvent[]>(() =>
    getStreamingDebugEvents(),
  );
  const [debugEnabled, setDebugEnabled] = useState(() =>
    isStreamingDebugEnabled(),
  );
  const [metricsVersion, setMetricsVersion] = useState(0);

  const durationSamplesRef = useRef<number[]>([]);
  const lastCommitRef = useRef(0);
  const lastCommitGapRef = useRef(0);
  const metricsDirtyRef = useRef(false);
  const displayedTextRef = useRef("");
  const lastProfiledTextRef = useRef("");

  const isStreaming = running && streamingIndex < sourceText.length;
  const streamedSource = sourceText.slice(
    0,
    isStreaming ? streamingIndex : sourceText.length,
  );
  const effectiveMode = effectiveStreamUpdateMode({
    updateMode,
    pacedIntervalMs,
    renderMode,
    showProgress: true,
  });
  const throttled = useThrottledStreamContent(
    streamedSource,
    isStreaming,
    effectiveMode.updateMode,
    effectiveMode.pacedIntervalMs,
  );

  const displayedText = throttled.displayed;
  displayedTextRef.current = displayedText;

  const previewMessage = useMemo(
    () =>
      ({
        id: "streaming-debug-assistant",
        role: "assistant",
        parts: [{ type: "text", text: displayedText }],
      }) as UIMessage,
    [displayedText],
  );

  useEffect(() => {
    if (!running) return;
    if (streamingIndex >= sourceText.length) {
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => {
      setStreamingIndex((current) =>
        Math.min(sourceText.length, current + Math.max(1, chunkSize)),
      );
    }, Math.max(5, chunkIntervalMs));
    return () => clearTimeout(timer);
  }, [chunkIntervalMs, chunkSize, running, sourceText.length, streamingIndex]);

  useEffect(() => subscribeStreamingDebug(setEvents), []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!metricsDirtyRef.current) return;
      metricsDirtyRef.current = false;
      setMetricsVersion((value) => value + 1);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const onProfilerRender = useCallback<ProfilerOnRenderCallback>(
    (_id, _phase, actualDuration, _baseDuration, _startTime, commitTime) => {
      const latestDisplayedText = displayedTextRef.current;
      const textChangedSinceLastProfile =
        latestDisplayedText !== lastProfiledTextRef.current;
      if (!textChangedSinceLastProfile) {
        return;
      }
      lastProfiledTextRef.current = latestDisplayedText;

      const samples = durationSamplesRef.current;
      samples.push(actualDuration);
      if (samples.length > 400) {
        samples.splice(0, samples.length - 400);
      }
      if (lastCommitRef.current > 0) {
        lastCommitGapRef.current = Math.max(0, commitTime - lastCommitRef.current);
      }
      lastCommitRef.current = commitTime;
      metricsDirtyRef.current = true;
    },
    [],
  );

  const metrics = useMemo(() => {
    const summary = summarizeDurations(durationSamplesRef.current);
    return {
      ...summary,
      lastCommitGapMs: lastCommitGapRef.current,
    };
  }, [metricsVersion]);

  return (
    <main className="min-h-[100dvh] bg-zinc-50 px-6 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Streaming Diagnostics</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Profile streaming commits, parser cost, and throttling behavior.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        <section className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Render mode
            </p>
            <Select
              value={renderMode}
              onValueChange={(value) => setRenderMode(value as StreamRenderMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STREAM_RENDER_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Update mode
            </p>
            <Select
              value={updateMode}
              onValueChange={(value) => setUpdateMode(value as StreamUpdateMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STREAM_UPDATE_MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Paced interval
            </p>
            <Select
              value={`${pacedIntervalMs}`}
              onValueChange={(value) =>
                setPacedIntervalMs(Number(value) as StreamPacedIntervalMs)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STREAM_PACED_INTERVALS.map((option) => (
                  <SelectItem key={option.id} value={`${option.id}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Chunk chars
            </p>
            <Input
              type="number"
              min={1}
              max={2000}
              value={chunkSize}
              onChange={(event) =>
                setChunkSize(Math.max(1, Number(event.target.value) || 1))
              }
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Chunk interval ms
            </p>
            <Input
              type="number"
              min={5}
              max={2000}
              value={chunkIntervalMs}
              onChange={(event) =>
                setChunkIntervalMs(Math.max(5, Number(event.target.value) || 5))
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              onClick={() => setRunning((value) => !value)}
              className="min-w-[110px]"
            >
              {running ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRunning(false);
                setStreamingIndex(0);
                durationSamplesRef.current = [];
                lastCommitRef.current = 0;
                lastCommitGapRef.current = 0;
                lastProfiledTextRef.current = "";
                setMetricsVersion((value) => value + 1);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Stream source
            </p>
            <textarea
              className="h-56 w-full resize-y rounded-md border border-zinc-200 bg-white p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
            />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Metrics
            </p>
            <div className="space-y-1.5 text-sm">
              <div>Progress: {streamingIndex} / {sourceText.length} chars</div>
              <div>Pending: {throttled.pendingChars} chars</div>
              <div>Commits: {metrics.commits}</div>
              <div>Avg commit: {metrics.averageMs.toFixed(2)} ms</div>
              <div>P95 commit: {metrics.p95Ms.toFixed(2)} ms</div>
              <div>Max commit: {metrics.maxMs.toFixed(2)} ms</div>
              <div>Commits over 16ms: {metrics.over16Ms}</div>
              <div>Commits over 33ms: {metrics.over33Ms}</div>
              <div>Last commit: {metrics.lastMs.toFixed(2)} ms</div>
              <div>Last commit gap: {metrics.lastCommitGapMs.toFixed(2)} ms</div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Render preview
          </p>
          <Profiler id="streaming-preview" onRender={onProfilerRender}>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <MessageBubble
                message={previewMessage}
                streaming={isStreaming}
                displayText={displayedText}
                streamRenderMode={renderMode}
                columnCount={1}
              />
            </div>
          </Profiler>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="mr-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Runtime logs
            </p>
            <Button
              type="button"
              variant={debugEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const next = !debugEnabled;
                setDebugEnabled(next);
                setStreamingDebugEnabled(next);
              }}
            >
              {debugEnabled ? "Logging enabled" : "Enable logging"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearStreamingDebugEvents()}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Clear
            </Button>
            <span className="text-xs text-zinc-500">
              showing {Math.min(events.length, 150)} / {events.length}
            </span>
          </div>

          <div className="max-h-[280px] overflow-auto rounded-md border border-zinc-200 text-xs dark:border-zinc-800">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900">
                <tr className="text-left">
                  <th className="px-2 py-1">Time</th>
                  <th className="px-2 py-1">Source</th>
                  <th className="px-2 py-1">Event</th>
                  <th className="px-2 py-1">Duration</th>
                  <th className="px-2 py-1">Meta</th>
                </tr>
              </thead>
              <tbody>
                {events
                  .slice(-150)
                  .reverse()
                  .map((event) => (
                    <tr
                      key={event.id}
                      className="border-t border-zinc-200 align-top dark:border-zinc-800"
                    >
                      <td className="whitespace-nowrap px-2 py-1">
                        {new Date(event.ts).toLocaleTimeString()}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1">{event.source}</td>
                      <td className="whitespace-nowrap px-2 py-1">{event.event}</td>
                      <td className="whitespace-nowrap px-2 py-1">
                        {typeof event.durationMs === "number"
                          ? `${event.durationMs.toFixed(2)} ms`
                          : "-"}
                      </td>
                      <td className="px-2 py-1">
                        {event.meta ? JSON.stringify(event.meta) : "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
