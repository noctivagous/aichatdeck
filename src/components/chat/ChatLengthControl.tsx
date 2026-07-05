"use client";

import { cn } from "@/lib/utils";
import {
  CHAT_LENGTH_OPTIONS,
  chatLengthDescription,
  type ChatLengthId,
} from "@/lib/chat-length";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChatLengthControlProps = {
  value: ChatLengthId;
  onChange: (id: ChatLengthId) => void;
  disabled?: boolean;
  variant?: "composer" | "toolbar";
};

const shellClassName = (variant: "composer" | "toolbar") =>
  cn(
    "flex shrink-0 items-center gap-2 rounded-[14px] border border-zinc-200/70 bg-zinc-100/80 px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900/80",
    variant === "toolbar" ? "h-[34px] rounded-[10px]" : "h-[46px]",
  );

const segmentClassName = (
  active: boolean,
  variant: "composer" | "toolbar",
  disabled?: boolean,
) =>
  cn(
    "rounded-[8px] font-medium transition",
    variant === "toolbar"
      ? "px-2 py-1 text-[11px] sm:px-2.5"
      : "px-2 py-1.5 text-[11px] sm:px-2.5 sm:text-[12px]",
    active
      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
    disabled && "pointer-events-none opacity-50",
  );

export function ChatLengthControl({
  value,
  onChange,
  disabled,
  variant = "composer",
}: ChatLengthControlProps) {
  const selected =
    CHAT_LENGTH_OPTIONS.find((option) => option.id === value) ??
    CHAT_LENGTH_OPTIONS[3];

  return (
    <>
      <div
        className={cn(shellClassName(variant), "lg:hidden")}
        role="group"
        aria-label="Response length"
      >
        <span className="shrink-0 text-[11px] font-medium text-zinc-500">
          Length:
        </span>
        <Select
          value={value}
          onValueChange={(next) => onChange(next as ChatLengthId)}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-8 w-[6.75rem] border-0 bg-transparent px-1 shadow-none focus:ring-0"
            title={chatLengthDescription(value)}
            aria-label="Response length"
          >
            <SelectValue>{selected.label}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[12rem]">
            {CHAT_LENGTH_OPTIONS.map((option) => (
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
        className={cn(shellClassName(variant), "hidden lg:flex")}
        role="group"
        aria-label="Response length"
      >
        <span className="shrink-0 text-[11px] font-medium text-zinc-500">
          Length:
        </span>
        <div className="flex rounded-[10px] bg-zinc-200/50 p-0.5 dark:bg-zinc-800/90">
          {CHAT_LENGTH_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={value === option.id}
              title={chatLengthDescription(option.id)}
              className={segmentClassName(
                value === option.id,
                variant,
                disabled,
              )}
              onClick={() => onChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}