import type { ProviderId } from "../types";

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  keyPlaceholder: string;
  docsUrl: string;
  headerKey: string;
};

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "openai",
    name: "OpenAI",
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    headerKey: "x-openai-key",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    headerKey: "x-anthropic-key",
  },
  {
    id: "google",
    name: "Google AI",
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/apikey",
    headerKey: "x-google-key",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    keyPlaceholder: "sk-or-...",
    docsUrl: "https://openrouter.ai/keys",
    headerKey: "x-openrouter-key",
  },
  {
    id: "xai",
    name: "xAI",
    keyPlaceholder: "xai-...",
    docsUrl: "https://console.x.ai",
    headerKey: "x-xai-key",
  },
];

export function getProviderMeta(id: ProviderId): ProviderMeta {
  return PROVIDERS.find((p) => p.id === id)!;
}