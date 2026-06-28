"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isReplyFontScaleId,
  REPLY_FONT_SCALES,
  replyFontScaleLabel,
  replyFontScaleTriggerLabel,
  type ReplyFontScaleId,
} from "@/lib/reply-font-size";

type ReplyFontSizeControlProps = {
  value: ReplyFontScaleId;
  onChange: (scale: ReplyFontScaleId) => void;
};

export function ReplyFontSizeControl({
  value,
  onChange,
}: ReplyFontSizeControlProps) {
  return (
    <div
      className="hidden items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/60 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60 md:flex"
      title="Reply font size"
    >
      <span className="shrink-0 text-[11px] font-medium text-zinc-500">
        Font size
      </span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (isReplyFontScaleId(next)) onChange(next);
        }}
      >
        <SelectTrigger
          className="h-7 w-[3.25rem] border-0 bg-transparent px-1 text-[11px] font-medium tabular-nums shadow-none focus:ring-0"
          aria-label="Reply font size"
        >
          <SelectValue className="sr-only" />
          <span className="truncate">{replyFontScaleTriggerLabel(value)}</span>
        </SelectTrigger>
        <SelectContent align="start" className="min-w-[9.5rem]">
          {REPLY_FONT_SCALES.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              className="text-[13px] tabular-nums"
            >
              {replyFontScaleLabel(option.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}