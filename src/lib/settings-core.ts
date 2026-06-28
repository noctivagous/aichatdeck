import {
  PROVIDER_IDS,
  type AppSettings,
  type ModelRef,
  type ProviderId,
  type ProviderSettings,
} from "./types";
import { inferLegacyModelRef } from "./model-ref";

function emptyProviderSettings(): ProviderSettings {
  return {
    apiKey: "",
    status: "unconfigured",
    models: [],
  };
}

export function createDefaultSettings(): AppSettings {
  return {
    version: 2,
    providers: Object.fromEntries(
      PROVIDER_IDS.map((id) => [id, emptyProviderSettings()]),
    ) as Record<ProviderId, ProviderSettings>,
    defaultModel: null,
  };
}

export const DEFAULT_SETTINGS: AppSettings = createDefaultSettings();

type LegacySettings = {
  defaultModelId?: string;
  apiKeys?: Partial<Record<ProviderId, string>>;
};

export function migrateSettings(raw: unknown): AppSettings {
  if (
    raw &&
    typeof raw === "object" &&
    "version" in raw &&
    (raw as AppSettings).version === 2 &&
    "providers" in raw
  ) {
    const next = createDefaultSettings();
    const incoming = raw as AppSettings;
    for (const id of PROVIDER_IDS) {
      next.providers[id] = {
        ...emptyProviderSettings(),
        ...incoming.providers[id],
      };
    }
    next.defaultModel = incoming.defaultModel ?? null;
    return next;
  }

  const legacy = (raw ?? {}) as LegacySettings;
  const next = createDefaultSettings();

  if (legacy.apiKeys) {
    for (const id of PROVIDER_IDS) {
      const key = legacy.apiKeys[id];
      if (key?.trim()) {
        next.providers[id].apiKey = key.trim();
      }
    }
  }

  if (legacy.defaultModelId) {
    const ref = inferLegacyModelRef(legacy.defaultModelId);
    if (ref) next.defaultModel = ref;
  }

  return next;
}

export function getProviderKey(
  settings: AppSettings,
  provider: ProviderId,
): string {
  return settings.providers[provider]?.apiKey?.trim() ?? "";
}

export function getAllProviderKeys(
  settings: AppSettings,
): Record<ProviderId, string> {
  return Object.fromEntries(
    PROVIDER_IDS.map((id) => [id, getProviderKey(settings, id)]),
  ) as Record<ProviderId, string>;
}

export function connectedProviders(settings: AppSettings): ProviderId[] {
  return PROVIDER_IDS.filter(
    (id) => settings.providers[id].status === "connected",
  );
}

export function connectedModels(settings: AppSettings) {
  return connectedProviders(settings).flatMap((provider) =>
    settings.providers[provider].models.map((model) => ({
      ...model,
      provider,
      ref: { provider, modelId: model.id } satisfies ModelRef,
    })),
  );
}

export function hasConnectedProvider(settings: AppSettings): boolean {
  return connectedProviders(settings).length > 0;
}

export function resolveModelRef(
  settings: AppSettings,
  modelId: string,
): ModelRef | null {
  const parsed = inferLegacyModelRef(modelId) ?? parseStoredModelRef(modelId);
  if (!parsed) return settings.defaultModel;

  const connected = settings.providers[parsed.provider];
  if (connected?.status === "connected") {
    const exists = connected.models.some((m) => m.id === parsed.modelId);
    if (exists) return parsed;
  }

  const fallback = connectedModels(settings)[0];
  return fallback?.ref ?? settings.defaultModel;
}

function parseStoredModelRef(value: string): ModelRef | null {
  const colon = value.indexOf(":");
  if (colon <= 0) return null;
  return {
    provider: value.slice(0, colon) as ProviderId,
    modelId: value.slice(colon + 1),
  };
}