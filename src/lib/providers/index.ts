import type { ProviderId } from "../types";
import { fetchAnthropicModels } from "./anthropic";
import { fetchGoogleModels } from "./google";
import { fetchOpenAIModels } from "./openai";
import { fetchOpenRouterModels } from "./openrouter";
import { fetchXaiModels } from "./xai";
import type { ProviderTestResult } from "./types";

export type { ProviderTestResult } from "./types";
export { PROVIDERS, getProviderMeta } from "./config";

export async function testProvider(
  provider: ProviderId,
  apiKey: string,
): Promise<ProviderTestResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: "API key is required" };
  }

  switch (provider) {
    case "openai":
      return fetchOpenAIModels(key);
    case "anthropic":
      return fetchAnthropicModels(key);
    case "google":
      return fetchGoogleModels(key);
    case "openrouter":
      return fetchOpenRouterModels(key);
    case "xai":
      return fetchXaiModels(key);
  }
}