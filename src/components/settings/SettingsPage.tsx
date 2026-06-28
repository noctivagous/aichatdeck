"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderCard } from "./ProviderCard";
import { PROVIDERS, getProviderMeta } from "@/lib/providers";
import { encodeModelRef } from "@/lib/model-ref";
import { useProviderCatalog } from "@/hooks/useProviderCatalog";
import type { ProviderId } from "@/lib/types";
import {
  fetchStorageHealth,
  type StorageHealth,
} from "@/lib/storage/client";
import { useReplyLineHeight } from "@/hooks/useReplyLineHeight";
import {
  isReplyLineHeightId,
  REPLY_LINE_HEIGHTS,
  replyLineHeightLabel,
} from "@/lib/reply-line-height";

export function SettingsPage() {
  const {
    settings,
    hydrated,
    updateProvider,
    testProviderConnection,
    setDefaultModel,
    clearProvider,
    connectedModels,
    hasConnectedProvider,
  } = useProviderCatalog();

  const [storage, setStorage] = useState<StorageHealth | null>(null);
  const { lineHeight, setReplyLineHeight } = useReplyLineHeight();

  useEffect(() => {
    void (async () => {
      try {
        setStorage(await fetchStorageHealth());
      } catch {
        setStorage({ ok: false, error: "Could not reach storage API" });
      }
    })();
  }, []);

  const handleTest = async (provider: ProviderId, apiKey: string) => {
    const result = await testProviderConnection(provider, apiKey);
    if (result.ok) {
      toast.success(`${getProviderMeta(provider).name} connected`);
    } else {
      toast.error(result.error);
    }
  };

  const defaultValue = settings.defaultModel
    ? encodeModelRef(settings.defaultModel)
    : undefined;

  if (!hydrated) {
    return (
      <div className="mx-auto min-h-[100dvh] max-w-5xl px-4 py-8">
        <p className="text-sm text-zinc-500">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-500">
            Connect providers, test API keys, and choose your default model.
            Chats and keys are stored in the server SQLite database.
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-2">
          <Label>Reply line spacing</Label>
          <p className="text-sm text-zinc-500">
            Controls line height for rendered markdown in assistant replies.
          </p>
          <Select
            value={lineHeight}
            onValueChange={(value) => {
              if (isReplyLineHeightId(value)) setReplyLineHeight(value);
            }}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPLY_LINE_HEIGHTS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {replyLineHeightLabel(option.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-2">
          <Label>Storage</Label>
          {storage?.ok ? (
            <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  SQLite database
                </span>{" "}
                — {storage.conversationCount ?? 0} conversation
                {(storage.conversationCount ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="break-all font-mono text-xs text-zinc-500">
                {storage.dbPath}
              </p>
              {storage.accessUrl ? (
                <p>
                  Other devices on your network can open{" "}
                  <span className="font-mono text-xs">{storage.accessUrl}</span>
                </p>
              ) : null}
              <p className="text-xs text-zinc-500">
                Back up by copying the database file above.
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              {storage?.error ?? "Storage unavailable"}
            </p>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((meta) => (
          <ProviderCard
            key={meta.id}
            meta={meta}
            settings={settings.providers[meta.id]}
            defaultModel={settings.defaultModel}
            onKeyChange={(apiKey) =>
              updateProvider(meta.id, {
                apiKey,
                status: "unconfigured",
                error: undefined,
                models: [],
              })
            }
            onTest={(apiKey) => handleTest(meta.id, apiKey)}
            onRefresh={(apiKey) => handleTest(meta.id, apiKey)}
            onClear={() => clearProvider(meta.id)}
            onSelectModel={(ref) => {
              setDefaultModel(ref);
              toast.success("Default model updated");
            }}
          />
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-2">
          <Label>Default model</Label>
          {hasConnectedProvider ? (
            <Select
              value={defaultValue}
              onValueChange={(value) => {
                const [provider, ...rest] = value.split(":");
                const modelId = rest.join(":");
                setDefaultModel({
                  provider: provider as ProviderId,
                  modelId,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a default model" />
              </SelectTrigger>
              <SelectContent>
                {connectedModels.map((model) => (
                  <SelectItem
                    key={`${model.provider}:${model.id}`}
                    value={encodeModelRef({
                      provider: model.provider,
                      modelId: model.id,
                    })}
                  >
                    [{getProviderMeta(model.provider).name}] {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-zinc-500">
              Connect at least one provider above to choose a default model.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}