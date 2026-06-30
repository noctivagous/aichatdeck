"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { OutlineEntry, SessionOutline } from "@/lib/session-outline";
import { ListTree } from "lucide-react";

type SessionOutlineSidebarProps = {
  outline: SessionOutline | null;
  mode?: "interactive" | "preview";
  activePageIndex?: number;
  onSelectPage?: (index: number, headingSlug?: string) => void;
  className?: string;
};

function entryIndent(level: OutlineEntry["level"]): string {
  switch (level) {
    case 1:
      return "pl-0";
    case 2:
      return "pl-3";
    case 3:
      return "pl-6";
    default:
      return "pl-0";
  }
}

function entryTextClass(level: OutlineEntry["level"]): string {
  switch (level) {
    case 1:
      return "text-[13px] font-semibold text-zinc-800 dark:text-zinc-100";
    case 2:
      return "text-[12px] font-medium text-zinc-600 dark:text-zinc-300";
    case 3:
      return "text-[11px] text-zinc-500 dark:text-zinc-400";
    default:
      return "text-[12px]";
  }
}

export function SessionOutlineSidebar({
  outline,
  mode = "preview",
  activePageIndex,
  onSelectPage,
  className,
}: SessionOutlineSidebarProps) {
  const interactive = mode === "interactive" && !!onSelectPage;

  const handleSelect = (pageIndex: number, headingSlug?: string) => {
    if (!interactive || !onSelectPage) return;
    onSelectPage(pageIndex, headingSlug);
  };

  return (
    <aside
      className={cn(
        "flex w-[260px] shrink-0 flex-col border-r border-zinc-200/70 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/60",
        className,
      )}
    >
      <div className="shrink-0 border-b border-zinc-200/70 px-4 py-3.5 dark:border-zinc-800">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ListTree className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold leading-tight tracking-tight">
              {outline?.title ?? "Session outline"}
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {outline
                ? `${outline.pageCount} page${outline.pageCount === 1 ? "" : "s"} · ~${(outline.tokenEstimate / 1000).toFixed(1)}k tokens`
                : mode === "preview"
                  ? "Select a conversation"
                  : "No outline yet"}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {!outline || outline.pages.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-zinc-500">
            No outline yet
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {outline.pages.map((page) => {
              const isActive =
                activePageIndex !== undefined &&
                activePageIndex === page.pageIndex;
              const hasChildren =
                page.entries.length > 0 || !!page.fallbackTitle;

              return (
                <div key={page.pageIndex} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={!interactive}
                    onClick={() => handleSelect(page.pageIndex)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition",
                      interactive &&
                        "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/80",
                      !interactive && "cursor-default",
                      isActive &&
                        "bg-blue-50 ring-2 ring-inset ring-blue-500/35 dark:bg-blue-500/10",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                        page.sealed
                          ? "bg-emerald-500/70"
                          : "bg-blue-500 animate-pulse",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium leading-tight text-zinc-800 dark:text-zinc-100">
                        {page.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-zinc-500">
                        {page.messageCount} msg
                        {page.sealed ? " · sealed" : " · live"}
                      </span>
                    </span>
                  </button>

                  {hasChildren ? (
                    <div className="mb-1 flex flex-col gap-0.5 pl-4 pr-1">
                      {page.entries.length > 0
                        ? page.entries.map((entry) => (
                            <button
                              key={`${page.pageIndex}-${entry.slug}-${entry.text}`}
                              type="button"
                              disabled={!interactive}
                              onClick={() =>
                                handleSelect(page.pageIndex, entry.slug)
                              }
                              className={cn(
                                "w-full rounded-md px-2 py-1 text-left transition",
                                entryIndent(entry.level),
                                entryTextClass(entry.level),
                                interactive &&
                                  "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/60",
                                !interactive && "cursor-default",
                              )}
                            >
                              <span className="line-clamp-2">{entry.text}</span>
                            </button>
                          ))
                        : page.fallbackTitle ? (
                            <p
                              className={cn(
                                "px-2 py-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400",
                                !interactive && "cursor-default",
                              )}
                            >
                              {page.fallbackTitle}
                            </p>
                          ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}