import type { ModelRef, ProviderId } from "./types";

export function encodeModelRef(ref: ModelRef): string {
  return `${ref.provider}:${ref.modelId}`;
}

export function parseModelRef(value: string): ModelRef | null {
  const colon = value.indexOf(":");
  if (colon <= 0) return inferLegacyModelRef(value);
  const provider = value.slice(0, colon) as ProviderId;
  const modelId = value.slice(colon + 1);
  if (!modelId) return null;
  return { provider, modelId };
}

export function inferLegacyModelRef(modelId: string): ModelRef | null {
  const lower = modelId.toLowerCase();
  if (modelId.includes("/")) {
    return { provider: "openrouter", modelId };
  }
  if (lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3") || lower.startsWith("o4") || lower.startsWith("chatgpt")) {
    return { provider: "openai", modelId };
  }
  if (lower.startsWith("claude")) {
    return { provider: "anthropic", modelId };
  }
  if (lower.startsWith("gemini")) {
    return { provider: "google", modelId };
  }
  if (lower.startsWith("grok") || lower === "latest") {
    return { provider: "xai", modelId };
  }
  return null;
}

export function formatModelLabel(ref: ModelRef, label?: string): string {
  if (label) return label;
  return ref.modelId;
}