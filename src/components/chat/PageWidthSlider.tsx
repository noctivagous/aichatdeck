"use client";

import { PAGE_WIDTH } from "@/lib/page-width";

type PageWidthSliderProps = {
  value: number;
  onPreview: (width: number) => void;
  onCommit: (width: number) => void;
};

export function PageWidthSlider({
  value,
  onPreview,
  onCommit,
}: PageWidthSliderProps) {
  return (
    <div
      className="hidden items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/60 px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60 md:flex"
      title="Page width"
    >
      <span className="shrink-0 text-[11px] font-medium text-zinc-500">
        Width
      </span>
      <input
        type="range"
        min={PAGE_WIDTH.min}
        max={PAGE_WIDTH.max}
        step={PAGE_WIDTH.step}
        value={value}
        aria-label="Page width"
        aria-valuemin={PAGE_WIDTH.min}
        aria-valuemax={PAGE_WIDTH.max}
        aria-valuenow={value}
        aria-valuetext={`${value} pixels`}
        className="page-width-slider h-1.5 w-24 cursor-pointer accent-blue-600"
        onChange={(e) => onPreview(Number(e.currentTarget.value))}
        onPointerUp={(e) => onCommit(Number(e.currentTarget.value))}
        onKeyUp={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            onCommit(Number(e.currentTarget.value));
          }
        }}
      />
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
        {value}px
      </span>
    </div>
  );
}