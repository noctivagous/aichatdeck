"use client";

import { useCallback } from "react";
import { getProviderMeta } from "@/lib/providers";
import {
  connectedModels,
  connectedProviders,
  createDefaultSettings,
  hasConnectedProvider,
} from "@/lib/settings";
import type { AppSettings, ModelRef, ProviderId } from "@/lib/types";
import { useHydratedSettings } from "./useHydratedSettings";

export function useProviderCatalog() {
  const { settings, setSettings, hydrated, reload } = useHydratedSettings();

  const updateProvider = useCallback(
    (provider: ProviderId, patch: Partial<AppSettings["providers"][ProviderId]>) => {
      setSettings((current) => ({
        ...current,
        providers: {
          ...current.providers,
          [provider]: {
            ...current.providers[provider],
            ...patch,
          },
        },
      }));
    },
    [setSettings],
  );

  const testProviderConnection = useCallback(
    async (provider: ProviderId, apiKey: string) => {
      const key = apiKey.trim();

      if (!key) {
        updateProvider(provider, {
          status: "error",
          error: "Enter an API key first",
        });
        return { ok: false as const, error: "Enter an API key first" };
      }

      setSettings((current) => ({
        ...current,
        providers: {
          ...current.providers,
          [provider]: {
            ...current.providers[provider],
            apiKey: key,
            status: "testing",
            error: undefined,
          },
        },
      }));

      const meta = getProviderMeta(provider);
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [meta.headerKey]: key,
        },
        body: JSON.stringify({ provider, apiKey: key }),
      });

      let data = (await res.json()) as
        | { ok: true; models: AppSettings["providers"][ProviderId]["models"] }
        | { ok: false; error: string };

      if (!res.ok && !("ok" in data)) {
        data = { ok: false, error: `Request failed (${res.status})` };
      }

      if (!data.ok) {
        updateProvider(provider, {
          apiKey: key,
          status: "error",
          error: data.error,
          models: [],
        });
        return data;
      }

      setSettings((current) => {
        const next: AppSettings = {
          ...current,
          providers: {
            ...current.providers,
            [provider]: {
              ...current.providers[provider],
              apiKey: key,
              status: "connected",
              error: undefined,
              models: data.models,
              testedAt: Date.now(),
            },
          },
        };

        if (!next.defaultModel && data.models[0]) {
          next.defaultModel = { provider, modelId: data.models[0].id };
        }

        return next;
      });

      return data;
    },
    [setSettings, updateProvider],
  );

  const setDefaultModel = useCallback(
    (ref: ModelRef) => {
      setSettings((current) => ({ ...current, defaultModel: ref }));
    },
    [setSettings],
  );

  const clearProvider = useCallback(
    (provider: ProviderId) => {
      setSettings((current) => {
        const empty = createDefaultSettings().providers[provider];
        const next: AppSettings = {
          ...current,
          providers: {
            ...current.providers,
            [provider]: empty,
          },
        };

        if (next.defaultModel?.provider === provider) {
          const fallback = connectedModels(next)[0];
          next.defaultModel = fallback?.ref ?? null;
        }

        return next;
      });
    },
    [setSettings],
  );

  return {
    settings,
    hydrated,
    reload,
    setSettings,
    updateProvider,
    testProviderConnection,
    setDefaultModel,
    clearProvider,
    connectedModels: connectedModels(settings),
    connectedProviders: connectedProviders(settings),
    hasConnectedProvider: hasConnectedProvider(settings),
  };
}