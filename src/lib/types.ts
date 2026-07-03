import type { UIMessage } from "ai";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "xai";

export const PROVIDER_IDS: ProviderId[] = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "xai",
];

export type ModelOption = {
  id: string;
  label: string;
  provider: ProviderId;
  description?: string;
};

export type ProviderStatus =
  | "unconfigured"
  | "testing"
  | "connected"
  | "error";

export type ProviderSettings = {
  apiKey: string;
  status: ProviderStatus;
  error?: string;
  models: ModelOption[];
  testedAt?: number;
};

export type ModelRef = {
  provider: ProviderId;
  modelId: string;
};

export type AppSettings = {
  version: 2;
  providers: Record<ProviderId, ProviderSettings>;
  defaultModel: ModelRef | null;
};

export type ConversationRecord = {
  id: string;
  title: string;
  modelId: string;
  messages: UIMessage[];
  /** Last message index for each page except the final page. */
  pageBreaks: number[];
  /** Page indices that are sealed (all others are open for editing). */
  sealedPageIndices: number[];
  /** Page that receives new prompts and replies. */
  activePageIndex: number;
  /** Last horizontally focused slide index in this conversation. */
  focusedPageIndex: number;
  createdAt: number;
  updatedAt: number;
};

export type PageView = {
  index: number;
  label: string;
  sealed: boolean;
  messages: UIMessage[];
  tokenEstimate: number;
};