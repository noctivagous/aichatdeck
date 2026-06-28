"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ProviderMeta } from "@/lib/providers/config";
import type { ModelRef, ProviderId, ProviderSettings } from "@/lib/types";

type ProviderCardProps = {
  meta: ProviderMeta;
  settings: ProviderSettings;
  defaultModel: ModelRef | null;
  onKeyChange: (key: string) => void;
  onTest: (apiKey: string) => Promise<void>;
  onRefresh: (apiKey: string) => Promise<void>;
  onClear: () => void;
  onSelectModel: (ref: ModelRef) => void;
};

function statusLabel(status: ProviderSettings["status"]) {
  switch (status) {
    case "connected":
      return "Connected";
    case "testing":
      return "Testing…";
    case "error":
      return "Invalid key";
    default:
      return "Not configured";
  }
}

export function ProviderCard({
  meta,
  settings,
  defaultModel,
  onKeyChange,
  onTest,
  onRefresh,
  onClear,
  onSelectModel,
}: ProviderCardProps) {
  const [search, setSearch] = useState("");
  const [localKey, setLocalKey] = useState(settings.apiKey);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpenRouter = meta.id === "openrouter";

  const currentKey = () =>
    (inputRef.current?.value ?? localKey).trim();

  useEffect(() => {
    setLocalKey(settings.apiKey);
  }, [settings.apiKey]);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return settings.models;
    const q = search.toLowerCase();
    return settings.models.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q),
    );
  }, [settings.models, search]);

  const testedLabel =
    settings.testedAt != null
      ? `tested ${formatRelative(settings.testedAt)}`
      : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{meta.name}</h2>
          <p className="text-xs text-zinc-500">
            <Link
              href={meta.docsUrl}
              target="_blank"
              className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Get API key
              <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>
        <StatusBadge status={settings.status} />
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${meta.id}-key`}>API key</Label>
          <Input
            ref={inputRef}
            id={`${meta.id}-key`}
            type="password"
            placeholder={meta.keyPlaceholder}
            autoComplete="off"
            value={localKey}
            onChange={(e) => {
              setLocalKey(e.target.value);
              onKeyChange(e.target.value);
            }}
            onInput={(e) => {
              const value = e.currentTarget.value;
              setLocalKey(value);
              onKeyChange(value);
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => void onTest(currentKey())}
            disabled={settings.status === "testing"}
          >
            {settings.status === "testing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Test connection
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onRefresh(currentKey())}
            disabled={settings.status === "testing"}
          >
            Refresh models
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        </div>

        <div className="text-xs text-zinc-500">
          {settings.status === "connected" ? (
            <span>
              {settings.models.length} chat models
              {testedLabel ? ` · ${testedLabel}` : ""}
            </span>
          ) : settings.status === "error" ? (
            <span className="text-red-500">{settings.error}</span>
          ) : (
            <span>Connect to fetch available models</span>
          )}
        </div>

        {settings.status === "connected" ? (
          <div className="space-y-2">
            {isOpenRouter ? (
              <Input
                placeholder="Search models…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            ) : null}
            <ScrollArea className="h-48 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredModels.length === 0 ? (
                  <p className="p-3 text-xs text-zinc-500">No models match</p>
                ) : (
                  filteredModels.map((model) => {
                    const ref = {
                      provider: meta.id as ProviderId,
                      modelId: model.id,
                    };
                    const isDefault =
                      defaultModel?.provider === ref.provider &&
                      defaultModel.modelId === ref.modelId;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => onSelectModel(ref)}
                        className={cn(
                          "flex w-full flex-col items-start px-3 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                          isDefault && "bg-blue-50 dark:bg-blue-950/30",
                        )}
                      >
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-zinc-500">
                          {model.description ?? model.id}
                        </span>
                        {isDefault ? (
                          <span className="mt-1 text-[11px] font-medium text-blue-600">
                            Default model
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProviderSettings["status"] }) {
  const styles = {
    connected:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    testing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    error: "bg-red-500/10 text-red-600 dark:text-red-400",
    unconfigured: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  } as const;

  const Icon =
    status === "connected"
      ? CheckCircle2
      : status === "error"
        ? XCircle
        : status === "testing"
          ? Loader2
          : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[status],
      )}
    >
      {Icon ? (
        <Icon className={cn("h-3 w-3", status === "testing" && "animate-spin")} />
      ) : null}
      {statusLabel(status)}
    </span>
  );
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}