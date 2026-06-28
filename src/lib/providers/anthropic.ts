import type { ModelOption } from "../types";
import type { ProviderTestResult } from "./types";

type AnthropicModel = {
  id: string;
  display_name: string;
};

export async function fetchAnthropicModels(
  apiKey: string,
): Promise<ProviderTestResult> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: res.status === 401 ? "Invalid API key" : body || `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { data: AnthropicModel[] };
    const models: ModelOption[] = data.data.map((m) => ({
      id: m.id,
      label: m.display_name || m.id,
      provider: "anthropic",
    }));

    return { ok: true, models };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}