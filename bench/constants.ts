export const OUTPUT_DIRECTORY = "./results";

export const MAX_CONCURRENCY = 80;
export const TEST_RUNS_PER_MODEL = 30;
export const TIMEOUT_SECONDS = 400;
export const STAGGER_DELAY_MS = 150;

import { type LanguageModel } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";

export type RunnableModel = {
  name: string;
  llm: LanguageModel;
  providerOptions?: any;
  reasoning?: boolean;
};

// Include "usage" so we can log cost
const defaultProviderOptions = {
  usage: {
    include: true,
  },
};

export const modelsToRun: RunnableModel[] = [
  // Open weight
  {
    name: "kimi-k2-thinking",
    llm: openrouter("moonshotai/kimi-k2-thinking", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "kimi-k2.5",
    llm: openrouter("moonshotai/kimi-k2.5", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "glm-5",
    llm: openrouter("z-ai/glm-5", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "minimax-m2.5",
    llm: openrouter("minimax/minimax-m2.5", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "gpt-oss-120b-high",
    llm: openrouter("openai/gpt-oss-120b", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "deepseek-v3.2-thinking-high",
    llm: openrouter("deepseek/deepseek-v3.2", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },

  // Grok
  {
    name: "grok-4",
    llm: openrouter("x-ai/grok-4", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "grok-4.1-fast",
    llm: openrouter("x-ai/grok-4.1-fast", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },

  // Gemini
  {
    name: "gemini-3-pro-preview",
    llm: openrouter("google/gemini-3-pro-preview", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "gemini-3.1-pro-preview",
    llm: openrouter("google/gemini-3.1-pro-preview", defaultProviderOptions),
    reasoning: true,
  },
  // Anthropic
  {
    name: "claude-4.6-sonnet",
    llm: openrouter("anthropic/claude-sonnet-4.6", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "claude-4.5-opus-thinking-high",
    llm: openrouter("anthropic/claude-opus-4.5", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },
  {
    name: "claude-4.6-opus-thinking-high",
    llm: openrouter("anthropic/claude-opus-4.6", {
      ...defaultProviderOptions,
      reasoning: { effort: "high" },
    }),
    reasoning: true,
  },

  // OpenAI

  {
    name: "gpt-5-minimal",
    llm: openrouter("openai/gpt-5", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "minimal",
      },
    }),
    reasoning: true,
  },
  {
    name: "gpt-5-default",
    llm: openrouter("openai/gpt-5", defaultProviderOptions),
    reasoning: true,
  },
  {
    name: "gpt-5-high",
    llm: openrouter("openai/gpt-5", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "high",
      },
    }),
    reasoning: true,
  },
  {
    name: "gpt-5-mini",
    llm: openrouter("openai/gpt-5-mini", defaultProviderOptions),
    reasoning: true,
  },

  {
    name: "gpt-5.1-high",
    llm: openrouter("openai/gpt-5.1", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "high",
      },
    }),
    reasoning: true,
  },

  {
    name: "gpt-5.2-default",
    llm: openrouter("openai/gpt-5.2", defaultProviderOptions),
    reasoning: true,
  },
  {
    name: "gpt-5.2-high",
    llm: openrouter("openai/gpt-5.2", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "high",
      },
    }),
    reasoning: true,
  },
  {
    name: "gpt-5.2-xhigh",
    llm: openrouter("openai/gpt-5.2", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "xhigh",
      },
    }),
    reasoning: true,
  },
  {
    name: "gpt-5.2-pro",
    llm: openrouter("openai/gpt-5.2-pro", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "high",
      },
    }),
    reasoning: true,
  },
  {
    name: "gemini-3-flash-high",
    llm: openrouter("google/gemini-3-flash-preview", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "high",
      },
    }),
    reasoning: true,
  },
  {
    name: "gemini-3-flash-low",
    llm: openrouter("google/gemini-3-flash-preview", {
      ...defaultProviderOptions,
      reasoning: {
        effort: "low",
      },
    }),
    reasoning: true,
  },
];
