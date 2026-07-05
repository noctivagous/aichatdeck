export const STREAM_UPDATE_MODES = [
  {
    id: "instant",
    label: "Instant",
    description: "Show every token as it arrives. Most responsive, heaviest on the browser.",
  },
  {
    id: "smooth",
    label: "Smooth",
    description: "Coalesce updates to one paint per frame (~60 fps). Good default balance.",
  },
  {
    id: "paced",
    label: "Paced",
    description: "Batch visual updates on a fixed interval to reduce markdown work.",
  },
] as const;

export const STREAM_RENDER_MODES = [
  {
    id: "plain",
    label: "Plain text while streaming",
    description:
      "Render raw text during the reply, then switch to full markdown when complete.",
  },
  {
    id: "markdown",
    label: "Markdown while streaming",
    description:
      "Live markdown with block memoization and syntax repair. Pair with Paced updates for best performance.",
  },
  {
    id: "streamdown",
    label: "Streamdown",
    description:
      "Vercel's Streamdown renderer for live and completed replies. Handles incomplete chunks, Shiki code, KaTeX math, and Mermaid. Disables multi-column layout and custom polish.",
  },
] as const;

export const STREAM_PACED_INTERVALS = [
  { id: 16, label: "16 ms (~60 fps)" },
  { id: 32, label: "32 ms" },
  { id: 50, label: "50 ms" },
  { id: 100, label: "100 ms" },
  { id: 200, label: "200 ms" },
] as const;

export type StreamUpdateMode = (typeof STREAM_UPDATE_MODES)[number]["id"];
export type StreamRenderMode = (typeof STREAM_RENDER_MODES)[number]["id"];
export type StreamPacedIntervalMs =
  (typeof STREAM_PACED_INTERVALS)[number]["id"];

export type StreamingDisplaySettings = {
  updateMode: StreamUpdateMode;
  pacedIntervalMs: StreamPacedIntervalMs;
  renderMode: StreamRenderMode;
  showProgress: boolean;
};

export const STREAMING_DISPLAY_DEFAULTS: StreamingDisplaySettings = {
  updateMode: "smooth",
  pacedIntervalMs: 50,
  renderMode: "plain",
  showProgress: true,
};

/** Smooth + custom live markdown is capped to paced to avoid main-thread stalls. */
export function effectiveStreamUpdateMode(
  settings: StreamingDisplaySettings,
): Pick<StreamingDisplaySettings, "updateMode" | "pacedIntervalMs"> {
  if (settings.renderMode === "markdown" && settings.updateMode === "smooth") {
    return {
      updateMode: "paced",
      pacedIntervalMs: Math.max(settings.pacedIntervalMs, 50) as StreamPacedIntervalMs,
    };
  }

  return {
    updateMode: settings.updateMode,
    pacedIntervalMs: settings.pacedIntervalMs,
  };
}

const STORAGE_KEY = "aichatdeck-streaming-display";

const UPDATE_MODE_IDS = STREAM_UPDATE_MODES.map((mode) => mode.id);
const RENDER_MODE_IDS = STREAM_RENDER_MODES.map((mode) => mode.id);
const PACED_INTERVAL_IDS = STREAM_PACED_INTERVALS.map(
  (option) => option.id,
);

export function isStreamUpdateMode(value: string): value is StreamUpdateMode {
  return (UPDATE_MODE_IDS as readonly string[]).includes(value);
}

export function isStreamRenderMode(value: string): value is StreamRenderMode {
  return (RENDER_MODE_IDS as readonly string[]).includes(value);
}

export function isStreamPacedIntervalMs(
  value: number,
): value is StreamPacedIntervalMs {
  return (PACED_INTERVAL_IDS as readonly number[]).includes(value);
}

function normalizeSettings(
  value: Partial<StreamingDisplaySettings> | null | undefined,
): StreamingDisplaySettings {
  if (!value) return STREAMING_DISPLAY_DEFAULTS;

  return {
    updateMode:
      value.updateMode && isStreamUpdateMode(value.updateMode)
        ? value.updateMode
        : STREAMING_DISPLAY_DEFAULTS.updateMode,
    pacedIntervalMs:
      value.pacedIntervalMs && isStreamPacedIntervalMs(value.pacedIntervalMs)
        ? value.pacedIntervalMs
        : STREAMING_DISPLAY_DEFAULTS.pacedIntervalMs,
    renderMode:
      value.renderMode && isStreamRenderMode(value.renderMode)
        ? value.renderMode
        : STREAMING_DISPLAY_DEFAULTS.renderMode,
    showProgress:
      typeof value.showProgress === "boolean"
        ? value.showProgress
        : STREAMING_DISPLAY_DEFAULTS.showProgress,
  };
}

export function loadStreamingDisplay(): StreamingDisplaySettings {
  if (typeof window === "undefined") return STREAMING_DISPLAY_DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return STREAMING_DISPLAY_DEFAULTS;
    return normalizeSettings(JSON.parse(stored) as Partial<StreamingDisplaySettings>);
  } catch {
    return STREAMING_DISPLAY_DEFAULTS;
  }
}

export function saveStreamingDisplay(
  settings: StreamingDisplaySettings,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function streamUpdateModeLabel(mode: StreamUpdateMode): string {
  return STREAM_UPDATE_MODES.find((option) => option.id === mode)?.label ?? mode;
}

export function streamRenderModeLabel(mode: StreamRenderMode): string {
  return STREAM_RENDER_MODES.find((option) => option.id === mode)?.label ?? mode;
}