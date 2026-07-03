"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Paperclip, Send, Square } from "lucide-react";
import { useKeybindings } from "@/hooks/useKeybindings";
import { formatShortcut, keyBadgeClass } from "@/lib/keybindings/match";
import type { Keybinding } from "@/lib/keybindings/types";

export type ComposerHandle = {
  focus: () => void;
  blur: () => void;
};

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendToNewPage?: () => void;
  onStop?: () => void;
  onAttach: (files: FileList) => void;
  isStreaming: boolean;
  onFocusChange?: (focused: boolean) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  function Composer(
    {
      value,
      onChange,
      onSend,
      onSendToNewPage,
      onStop,
      onAttach,
      isStreaming,
      onFocusChange,
      disabled,
      autoFocus,
    },
    ref,
  ) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const chatBindings = useMemo<Keybinding[]>(
    () => [
      {
        id: "focus-composer",
        chord: "alt+t",
        scope: "chat",
        allowInTypingTarget: true,
        handler: () => {
          textareaRef.current?.focus();
        },
      },
    ],
    [],
  );

  useKeybindings("composer", bindings);
  useKeybindings("chat", chatBindings);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
    }),
    [],
  );

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, disabled]);

  return (
    <div className="mx-auto flex max-w-[900px] items-end gap-2.5">
      <div className="group relative flex-1">
        {!value && !disabled ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-start px-4 py-3 pr-11 text-[14px] leading-[1.4] text-zinc-500 group-focus-within:hidden dark:text-zinc-400"
          >
            Press{" "}
            <kbd className={keyBadgeClass}>{formatShortcut("alt+t")}</kbd> to
            enter this text box
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          aria-label="Message input for the live page"
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
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
            <span className="hidden items-center gap-1 sm:inline-flex">
              Send to New Page{" "}
              <kbd className={keyBadgeClass}>
                {formatShortcut("alt+enter")}
              </kbd>
            </span>
            <LayoutTemplate className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
},
);