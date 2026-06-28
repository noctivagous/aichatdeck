import type { ModelOption } from "../types";
import type { ProviderTestResult } from "./types";

type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  architecture?: {
    output_modalities?: string[];
  };
};

export async function fetchOpenRouterModels(
  apiKey: string,
): Promise<ProviderTestResult> {
  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/models?output_modalities=text",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: res.status === 401 ? "Invalid API key" : body || `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { data: OpenRouterModel[] };
    const models: ModelOption[] = data.data
      .filter(
        (m) =>
          m.architecture?.output_modalities?.includes("text") &&
          !m.id.includes("embed"),
      )
      .map((m) => ({
        id: m.id,
        label: m.name || m.id,
        provider: "openrouter" as const,
        description: m.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { ok: true, models };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}