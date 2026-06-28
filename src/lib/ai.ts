import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";
import type { ModelRef, ProviderId } from "./types";

export function getModel(
  ref: ModelRef,
  keys: Record<ProviderId, string>,
): LanguageModel {
  switch (ref.provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: keys.openai });
      return openai.chat(ref.modelId);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: keys.anthropic });
      return anthropic(ref.modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey: keys.google });
      return google(ref.modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey: keys.openrouter,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openrouter.chat(ref.modelId);
    }
    case "xai": {
      const xai = createXai({ apiKey: keys.xai });
      return xai(ref.modelId);
    }
  }
}

export function getProviderForModelRef(ref: ModelRef): ProviderId {
  return ref.provider;
}