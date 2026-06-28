"use client";

import { cn } from "@/lib/utils";
import type { PageColumnCount } from "@/lib/page-columns";

const OPTIONS: PageColumnCount[] = [1, 2, 3];

type PageColumnsControlProps = {
  value: PageColumnCount;
  onChange: (columns: PageColumnCount) => void;
};

export function PageColumnsControl({ value, onChange }: PageColumnsControlProps) {
  return (
    <div
      className="hidden items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/60 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60 md:flex"
      title="Markdown column layout in replies"
      role="group"
      aria-label="Reply markdown columns"
    >
      <span className="shrink-0 text-[11px] font-medium text-zinc-500">Cols</span>
      <div className="flex rounded-md bg-zinc-100/90 p-0.5 dark:bg-zinc-800/90">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            className={cn(
              "min-w-[1.75rem] rounded-[5px] px-2 py-0.5 text-[11px] font-medium tabular-nums transition",
              value === option
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}