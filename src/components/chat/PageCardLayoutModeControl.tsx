"use client";

import { cn } from "@/lib/utils";
import {
  PAGE_CARD_LAYOUT_MODE_OPTIONS,
  type PageCardLayoutMode,
} from "@/lib/page-card-layout-mode";

type PageCardLayoutModeControlProps = {
  value: PageCardLayoutMode;
  onChange: (mode: PageCardLayoutMode) => void;
};

export function PageCardLayoutModeControl({
  value,
  onChange,
}: PageCardLayoutModeControlProps) {
  return (
    <div
      role="group"
      aria-label="Page card layout"
      className="inline-flex shrink-0 rounded-md border border-zinc-200/80 bg-zinc-50/90 p-0.5 dark:border-zinc-700/80 dark:bg-zinc-800/70"
      onClick={(event) => event.stopPropagation()}
    >
      {PAGE_CARD_LAYOUT_MODE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          title={option.description}
          onClick={(event) => {
            event.stopPropagation();
            onChange(option.id);
          }}
          className={cn(
            "rounded-[5px] px-2 py-0.5 text-[10px] font-medium transition",
            value === option.id
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}