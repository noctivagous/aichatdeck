"use client";

import { cn } from "@/lib/utils";
import type { StreamUpdateMode } from "@/lib/streaming-display";
import { streamUpdateModeLabel } from "@/lib/streaming-display";

type StreamingProgressIndicatorProps = {
  receivedChars: number;
  displayedChars: number;
  pendingChars: number;
  updateMode: StreamUpdateMode;
  className?: string;
};

export function StreamingProgressIndicator({
  receivedChars,
  displayedChars,
  pendingChars,
  updateMode,
  className,
}: StreamingProgressIndicatorProps) {
  const hasBacklog = pendingChars > 0;
  const progress =
    receivedChars > 0
      ? Math.min(100, Math.round((displayedChars / receivedChars) * 100))
      : 8;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border border-blue-200/70 bg-blue-50/80 px-2 py-1 dark:border-blue-500/20 dark:bg-blue-500/10",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Streaming reply, ${receivedChars} characters received`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500/70 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
          <span>Streaming</span>
          <span className="tabular-nums text-blue-600/80 dark:text-blue-200/80">
            {receivedChars.toLocaleString()} chars
          </span>
          {hasBacklog ? (
            <span className="truncate text-blue-600/70 dark:text-blue-200/70">
              · catching up {pendingChars.toLocaleString()}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 h-1 w-[7.5rem] overflow-hidden rounded-full bg-blue-200/70 dark:bg-blue-900/50">
          <div
            className={cn(
              "h-full rounded-full bg-blue-500 transition-[width] duration-150 ease-out dark:bg-blue-400",
              hasBacklog && "animate-pulse",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span
        className="hidden shrink-0 text-[9px] text-blue-600/70 dark:text-blue-200/60 sm:inline"
        title={`Update mode: ${streamUpdateModeLabel(updateMode)}`}
      >
        {streamUpdateModeLabel(updateMode)}
      </span>
    </div>
  );
}