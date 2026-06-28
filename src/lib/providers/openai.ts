import type { ModelOption } from "../types";
import type { ProviderTestResult } from "./types";

type OpenAIModel = { id: string };

export async function fetchOpenAIModels(apiKey: string): Promise<ProviderTestResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: res.status === 401 ? "Invalid API key" : body || `HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { data: OpenAIModel[] };
    const models: ModelOption[] = data.data
      .map((m) => m.id)
      .filter(isOpenAIChatModel)
      .sort()
      .map((id) => ({
        id,
        label: id,
        provider: "openai" as const,
      }));

    return { ok: true, models };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

function isOpenAIChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (
    lower.includes("embedding") ||
    lower.includes("tts") ||
    lower.includes("whisper") ||
    lower.includes("dall-e") ||
    lower.includes("davinci") ||
    lower.includes("babbage") ||
    lower.includes("moderation")
  ) {
    return false;
  }
  return (
    lower.startsWith("gpt-") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4") ||
    lower.startsWith("chatgpt")
  );
}