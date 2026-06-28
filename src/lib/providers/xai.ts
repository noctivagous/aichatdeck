import type { ModelOption } from "../types";
import type { ProviderTestResult } from "./types";

type XaiModel = {
  id: string;
  aliases?: string[];
  input_modalities?: string[];
  output_modalities?: string[];
  completion_text_token_price?: number | null;
  image_price?: number | null;
};

async function parseXaiError(res: Response): Promise<ProviderTestResult> {
  const body = await res.text();
  try {
    const json = JSON.parse(body) as { error?: string; message?: string };
    const message = json.error ?? json.message ?? body;
    if (
      res.status === 401 ||
      res.status === 403 ||
      (res.status === 400 && /api key/i.test(message))
    ) {
      return { ok: false, error: "Invalid API key" };
    }
    return { ok: false, error: message || `HTTP ${res.status}` };
  } catch {
    return { ok: false, error: body || `HTTP ${res.status}` };
  }
}

function isXaiChatModel(model: XaiModel): boolean {
  const id = model.id.toLowerCase();
  if (id.includes("imagine") || id.includes("video")) return false;

  if (model.output_modalities?.includes("text")) return true;

  // /v1/models shape: chat models have text completion pricing
  if (
    model.completion_text_token_price != null &&
    model.completion_text_token_price > 0
  ) {
    return true;
  }

  // Image-only models expose image_price without text completion pricing
  if (model.image_price != null && !model.completion_text_token_price) {
    return false;
  }

  return id === "latest" || id.startsWith("grok");
}

function mapXaiModels(raw: XaiModel[]): ModelOption[] {
  return raw
    .filter(isXaiChatModel)
    .map((model) => ({
      id: model.id,
      label: model.id,
      provider: "xai" as const,
      description:
        model.aliases && model.aliases.length > 0
          ? `Aliases: ${model.aliases.join(", ")}`
          : undefined,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchXaiEndpoint(
  url: string,
  apiKey: string,
): Promise<{ ok: true; raw: XaiModel[] } | { ok: false; res: Response }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    return { ok: false, res };
  }

  const data = (await res.json()) as {
    models?: XaiModel[];
    data?: XaiModel[];
  };

  return { ok: true, raw: data.models ?? data.data ?? [] };
}

export async function fetchXaiModels(apiKey: string): Promise<ProviderTestResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: "API key is required" };
  }

  try {
    const languageModels = await fetchXaiEndpoint(
      "https://api.x.ai/v1/language-models",
      key,
    );

    if (languageModels.ok) {
      const models = mapXaiModels(languageModels.raw);
      if (models.length > 0) return { ok: true, models };
    }

    const basicModels = await fetchXaiEndpoint(
      "https://api.x.ai/v1/models",
      key,
    );

    if (basicModels.ok) {
      const models = mapXaiModels(basicModels.raw);
      if (models.length > 0) return { ok: true, models };
      return {
        ok: false,
        error:
          "API key accepted but no chat models are available on this account.",
      };
    }

    return parseXaiError(basicModels.res);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}