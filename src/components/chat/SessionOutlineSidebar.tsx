"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_COUNTING_TYPE,
  formatCountLabel,
} from "@/lib/counting-types";
import type { OutlineEntry, SessionOutline } from "@/lib/session-outline";
import { ArrowLeft, ListTree } from "lucide-react";
import { pushWithViewTransition } from "@/lib/view-transition-nav";

type SessionOutlineSidebarProps = {
  outline: SessionOutline | null;
  mode?: "interactive" | "preview";
  activePageIndex?: number;
  onSelectPage?: (index: number, headingSlug?: string) => void;
  backHref?: string;
  transitionName?: string;
  className?: string;
};

function entryIndent(level: OutlineEntry["level"]): string {
  switch (level) {
    case 1:
      return "pl-0";
    case 2:
      return "pl-1.5";
    case 3:
      return "pl-3";
    default:
      return "pl-0";
  }
}

function entryTextClass(level: OutlineEntry["level"]): string {
  switch (level) {
    case 1:
      return "text-[15px] font-semibold text-zinc-800 dark:text-zinc-100";
    case 2:
      return "text-[14px] font-medium text-zinc-600 dark:text-zinc-300";
    case 3:
      return "text-[13px] text-zinc-500 dark:text-zinc-400";
    default:
      return "text-[14px]";
  }
}

export function SessionOutlineSidebar({
  outline,
  mode = "preview",
  activePageIndex,
  onSelectPage,
  backHref,
  transitionName,
  className,
}: SessionOutlineSidebarProps) {
  const router = useRouter();
  const interactive = mode === "interactive" && !!onSelectPage;

  const handleSelect = (pageIndex: number, headingSlug?: string) => {
    if (!interactive || !onSelectPage) return;
    onSelectPage(pageIndex, headingSlug);
  };

  return (
    <aside
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
      className={cn(
        "flex w-[260px] shrink-0 flex-col border-r border-zinc-200/70 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/60",
        className,
      )}
    >
      <div className="flex h-[60px] shrink-0 items-center border-b border-zinc-200/70 px-4 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2.5">
          {backHref ? (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              asChild
            >
              <Link
                href={backHref}
                aria-label="Back to conversations"
                onClick={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }
                  event.preventDefault();
                  pushWithViewTransition(router, backHref, "back");
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ListTree className="h-3.5 w-3.5" />
            </div>
          )}
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
              const hasChildren = page.items.length > 0;

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
                        {formatCountLabel(page.itemCount, DEFAULT_COUNTING_TYPE)}
                        {page.sealed ? " · sealed" : " · live"}
                      </span>
                    </span>
                  </button>

                  {hasChildren ? (
                    <div className="mb-1 flex w-full min-w-0 max-w-full flex-col gap-0.5 overflow-x-hidden pl-2 pr-3">
                      {page.items.map((item, itemIndex) =>
                        item.kind === "userPrompt" ? (
                          <p
                            key={`${page.pageIndex}-prompt-${itemIndex}`}
                            className="w-full min-w-0 max-w-full truncate rounded-md px-2 py-0.5 text-[10px] leading-snug text-zinc-500 ring-1 ring-inset ring-blue-500/40 dark:text-zinc-400"
                          >
                            {item.text}
                          </p>
                        ) : (
                          <button
                            key={`${page.pageIndex}-${item.entry.slug}-${item.entry.text}-${itemIndex}`}
                            type="button"
                            disabled={!interactive}
                            onClick={() =>
                              handleSelect(page.pageIndex, item.entry.slug)
                            }
                            className={cn(
                              "w-full min-w-0 max-w-full overflow-hidden rounded-md px-2 py-1 text-left transition",
                              entryIndent(item.entry.level),
                              entryTextClass(item.entry.level),
                              interactive &&
                                "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/60",
                              !interactive && "cursor-default",
                            )}
                          >
                            <span className="block max-w-full break-words whitespace-normal">
                              {item.entry.text}
                            </span>
                          </button>
                        ),
                      )}
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