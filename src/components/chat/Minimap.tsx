"use client";

import { cn } from "@/lib/utils";
import type { PageView } from "@/lib/types";

type MinimapProps = {
  pages: PageView[];
  currentIndex: number;
  onSelect: (index: number) => void;
};

export function Minimap({ pages, currentIndex, onSelect }: MinimapProps) {
  return (
    <div className="flex items-center gap-1.5">
      {pages.map((page) => (
        <button
          key={page.index}
          type="button"
          aria-label={`Go to ${page.label}`}
          onClick={() => onSelect(page.index)}
          className={cn(
            "group relative h-[20px] rounded-[6px] border transition-all",
            currentIndex === page.index
              ? "w-9 border-blue-600 bg-blue-600"
              : "w-[22px] border-zinc-300/50 bg-zinc-200 hover:bg-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700",
          )}
        >
          <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            {page.label}
          </span>
        </button>
      ))}
    </div>
  );
}