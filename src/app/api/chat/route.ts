import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getModel } from "@/lib/ai";
import { parseModelRef } from "@/lib/model-ref";
import { getAllProviderKeys } from "@/lib/settings-core";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat-system-prompt";
import { loadSettings } from "@/lib/server/settings";
import { PROVIDER_IDS, type ProviderId } from "@/lib/types";

export const maxDuration = 30;

function readKeysFromEnv(): Record<ProviderId, string> {
  return Object.fromEntries(
    PROVIDER_IDS.map((provider) => [
      provider,
      {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        openrouter: process.env.OPENROUTER_API_KEY,
        xai: process.env.XAI_API_KEY,
      }[provider] ?? "",
    ]),
  ) as Record<ProviderId, string>;
}

export async function POST(req: Request) {
  const { messages, modelId } = (await req.json()) as {
    messages: UIMessage[];
    modelId: string;
  };

  const modelRef = parseModelRef(modelId);
  if (!modelRef) {
    return Response.json({ error: "Invalid model reference" }, { status: 400 });
  }

  const settings = await loadSettings();
  const dbKeys = getAllProviderKeys(settings);
  const envKeys = readKeysFromEnv();
  const keys = Object.fromEntries(
    PROVIDER_IDS.map((provider) => [
      provider,
      dbKeys[provider] || envKeys[provider] || "",
    ]),
  ) as Record<ProviderId, string>;

  const provider = modelRef.provider;

  if (!keys[provider]) {
    return Response.json(
      { error: `Missing API key for ${provider}. Add it in Settings.` },
      { status: 401 },
    );
  }

  try {
    const result = streamText({
      model: getModel(modelRef, keys),
      system: CHAT_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate response";
    return Response.json({ error: message }, { status: 500 });
  }
}