import type { ModelOption } from "../types";
import type { ProviderTestResult } from "./types";

type GoogleModel = {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
};

export async function fetchGoogleModels(apiKey: string): Promise<ProviderTestResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: res.status === 400 || res.status === 403
          ? "Invalid API key"
          : body || `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { models?: GoogleModel[] };
    const models: ModelOption[] = (data.models ?? [])
      .filter(
        (m) =>
          m.name.includes("gemini") &&
          m.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((m) => {
        const id = m.name.replace("models/", "");
        return {
          id,
          label: m.displayName || id,
          provider: "google" as const,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return { ok: true, models };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}