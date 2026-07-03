"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import {
  CONVERSATION_SEARCH_PLACEHOLDERS,
  CONVERSATION_SEARCH_SCOPE_LABELS,
  CONVERSATION_SORT_LABELS,
  DEFAULT_CONVERSATION_FILTER,
  DEFAULT_CONVERSATION_SORT,
  type ConversationFilterId,
  type ConversationSearchScope,
  type ConversationSortId,
} from "@/lib/conversation-list-query";

type ConversationListToolbarProps = {
  search: string;
  searchScope: ConversationSearchScope;
  filter: ConversationFilterId;
  sort: ConversationSortId;
  totalCount: number;
  visibleCount: number;
  onSearchChange: (value: string) => void;
  onSearchScopeChange: (value: ConversationSearchScope) => void;
  onFilterChange: (value: ConversationFilterId) => void;
  onSortChange: (value: ConversationSortId) => void;
  onReset: () => void;
  className?: string;
};

const SEARCH_SCOPES: ConversationSearchScope[] = ["title", "messages"];

const STRUCTURE_FILTERS: { id: ConversationFilterId; label: string }[] = [
  { id: "all", label: "All conversations" },
  { id: "multi-page", label: "Multi-page" },
  { id: "single-page", label: "Single page" },
  { id: "has-qa", label: "Has Q&As" },
  { id: "empty", label: "Empty" },
];

export function ConversationListToolbar({
  search,
  searchScope,
  filter,
  sort,
  totalCount,
  visibleCount,
  onSearchChange,
  onSearchScopeChange,
  onFilterChange,
  onSortChange,
  onReset,
  className,
}: ConversationListToolbarProps) {
  const queryActive =
    search.trim().length > 0 ||
    filter !== DEFAULT_CONVERSATION_FILTER ||
    sort !== DEFAULT_CONVERSATION_SORT;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2.5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/70",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex h-8 shrink-0 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
          role="group"
          aria-label="Search scope"
        >
          {SEARCH_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              aria-pressed={searchScope === scope}
              onClick={() => onSearchScopeChange(scope)}
              className={cn(
                "rounded-[5px] px-2.5 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                searchScope === scope &&
                  "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
              )}
            >
              {CONVERSATION_SEARCH_SCOPE_LABELS[scope]}
            </button>
          ))}
        </div>

        <div className="relative min-w-[min(100%,220px)] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={CONVERSATION_SEARCH_PLACEHOLDERS[searchScope]}
            aria-label={CONVERSATION_SEARCH_PLACEHOLDERS[searchScope]}
            className="h-8 border-zinc-200/80 bg-zinc-50/90 pl-8 pr-8 text-[13px] dark:border-zinc-700/80 dark:bg-zinc-900/70"
          />
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>

        <Select
          value={filter}
          onValueChange={(value) =>
            onFilterChange(value as ConversationFilterId)
          }
        >
          <SelectTrigger
            aria-label="Filter conversations"
            className="h-8 w-[min(100%,168px)] shrink-0 text-[12px]"
          >
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent align="end">
            {STRUCTURE_FILTERS.map((item) => (
              <SelectItem key={item.id} value={item.id} className="text-[12px]">
                {item.label}
              </SelectItem>
            ))}
            {PROVIDERS.map((provider) => (
              <SelectItem
                key={provider.id}
                value={provider.id}
                className="text-[12px]"
              >
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(value) => onSortChange(value as ConversationSortId)}
        >
          <SelectTrigger
            aria-label="Sort conversations"
            className="h-8 w-[min(100%,168px)] shrink-0 text-[12px]"
          >
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent align="end">
            {(
              Object.entries(CONVERSATION_SORT_LABELS) as [
                ConversationSortId,
                string,
              ][]
            ).map(([id, label]) => (
              <SelectItem key={id} value={id} className="text-[12px]">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {visibleCount === totalCount
            ? `${totalCount} conversation${totalCount === 1 ? "" : "s"}`
            : `${visibleCount} of ${totalCount} conversations`}
        </p>
        {queryActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-6 px-2 text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}