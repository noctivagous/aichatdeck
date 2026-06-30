"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Paperclip, Send, Square } from "lucide-react";
import { useKeybindings } from "@/hooks/useKeybindings";
import { formatShortcut } from "@/lib/keybindings/match";
import type { Keybinding } from "@/lib/keybindings/types";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendToNewPage?: () => void;
  onStop?: () => void;
  onAttach: (files: FileList) => void;
  isStreaming: boolean;
  centerNewPages: boolean;
  onCenterNewPagesChange: (enabled: boolean) => void;
  disabled?: boolean;
};

export function Composer({
  value,
  onChange,
  onSend,
  onSendToNewPage,
  onStop,
  onAttach,
  isStreaming,
  centerNewPages,
  onCenterNewPagesChange,
  disabled,
}: ComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const sendShortcut = formatShortcut("alt+enter");

  const bindings = useMemo<Keybinding[]>(
    () => [
      {
        id: "send",
        chord: "enter",
        scope: "composer",
        requireTypingTarget: true,
        handler: () => {
          if (!isStreaming) onSend();
        },
      },
      {
        id: "send-to-new-page",
        chord: "alt+enter",
        scope: "composer",
        requireTypingTarget: true,
        handler: () => {
          if (!isStreaming && onSendToNewPage) onSendToNewPage();
        },
      },
    ],
    [isStreaming, onSend, onSendToNewPage],
  );

  useKeybindings("composer", bindings);

  return (
    <div className="mx-auto flex max-w-[900px] items-end gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={centerNewPages}
        title="When enabled, newly sealed pages scroll into view and center automatically"
        onClick={() => onCenterNewPagesChange(!centerNewPages)}
        className={`mb-0.5 h-[46px] w-[72px] shrink-0 rounded-[14px] border px-2 text-left text-[10px] leading-tight transition sm:w-auto sm:px-3 sm:text-[11px] ${
          centerNewPages
            ? "border-blue-500/40 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            : "border-zinc-200/70 bg-zinc-100 text-zinc-500 hover:bg-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
      >
        center
        <br />
        new pages
      </button>
      <div className="relative flex-1">
        <textarea
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="Continue on the live page…"
          onChange={(e) => {
            onChange(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          className="w-full max-h-[140px] resize-none rounded-[16px] border border-zinc-200/70 bg-zinc-100 px-4 py-3 pr-11 text-[14px] leading-[1.4] placeholder-zinc-500 transition focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-800 dark:bg-zinc-900"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAttach(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          title="Attach image"
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      </div>

      {isStreaming ? (
        <Button
          type="button"
          variant="secondary"
          className="h-[46px] shrink-0 rounded-[14px] px-4"
          onClick={onStop}
        >
          <Square className="h-4 w-4 fill-current" />
          <span className="hidden sm:inline">Stop</span>
        </Button>
      ) : (
        <>
          <Button
            type="button"
            disabled={disabled || !value.trim()}
            className="h-[46px] shrink-0 rounded-[14px] px-4 shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)]"
            onClick={onSend}
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !value.trim()}
            className="h-[46px] shrink-0 rounded-[14px] px-3.5"
            onClick={onSendToNewPage}
            title={`Send this message and start it on a new page (${sendShortcut})`}
          >
            <span className="hidden sm:inline">
              Send to New Page [{sendShortcut}]
            </span>
            <LayoutTemplate className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}