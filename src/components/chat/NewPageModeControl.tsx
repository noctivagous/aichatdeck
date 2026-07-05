"use client";

import { cn } from "@/lib/utils";
import {
  NEW_PAGE_MODE_OPTIONS,
  newPageModeDescription,
  type NewPageMode,
} from "@/lib/new-page-mode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NewPageModeControlProps = {
  value: NewPageMode;
  onChange: (mode: NewPageMode) => void;
  disabled?: boolean;
};

const shellClassName =
  "flex h-[46px] shrink-0 items-center gap-2 rounded-[14px] border border-zinc-200/70 bg-zinc-100/80 px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900/80";

const segmentClassName = (active: boolean, disabled?: boolean) =>
  cn(
    "rounded-[10px] px-2.5 py-1.5 text-[12px] font-medium transition sm:px-3",
    active
      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
    disabled && "pointer-events-none opacity-50",
  );

export function NewPageModeControl({
  value,
  onChange,
  disabled,
}: NewPageModeControlProps) {
  const selected =
    NEW_PAGE_MODE_OPTIONS.find((option) => option.id === value) ??
    NEW_PAGE_MODE_OPTIONS[0];

  return (
    <>
      <div
        className={cn(shellClassName, "lg:hidden")}
        role="group"
        aria-label="New page mode"
      >
        <span className="shrink-0 text-[11px] font-medium text-zinc-500">
          Page:
        </span>
        <Select
          value={value}
          onValueChange={(next) => onChange(next as NewPageMode)}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-8 w-[6.75rem] border-0 bg-transparent px-1 shadow-none focus:ring-0"
            title={newPageModeDescription(value)}
            aria-label="New page mode"
          >
            <SelectValue>{selected.label}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" className="min-w-[12rem]">
            {NEW_PAGE_MODE_OPTIONS.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                title={option.description}
              >
                <span className="flex flex-col gap-0.5 py-0.5">
                  <span>{option.label}</span>
                  <span className="text-[11px] font-normal text-zinc-500">
                    {option.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "hidden h-[46px] shrink-0 items-center rounded-[14px] border border-zinc-200/70 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/80 lg:flex",
        )}
        role="group"
        aria-label="New page mode"
        title="Keep Open: use Send to New Page. New Page: each prompt starts on a fresh page."
      >
        {NEW_PAGE_MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={value === option.id}
            title={option.description}
            className={segmentClassName(value === option.id, disabled)}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}