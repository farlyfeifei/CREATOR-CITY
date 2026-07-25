import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type OpenRouterModel = {
  id: string;
  name: string;
  context_length: number;
  pricing?: { prompt?: string; completion?: string };
};

const editorial = [
  { id: "openai/gpt-5.6-sol", shortName: "GPT-5.6 Sol", org: "OpenAI", coding: 98, reasoning: 97, agent: 98, multimodal: 91, speed: 72, use: "复杂工程与长程 Agent" },
  { id: "anthropic/claude-sonnet-5", shortName: "Claude Sonnet 5", org: "Anthropic", coding: 96, reasoning: 96, agent: 95, multimodal: 90, speed: 80, use: "代码、长文与工具调用" },
  { id: "google/gemini-3.6-flash", shortName: "Gemini 3.6 Flash", org: "Google", coding: 90, reasoning: 89, agent: 88, multimodal: 96, speed: 96, use: "高速多模态与长上下文" },
  { id: "qwen/qwen3.7-plus", shortName: "Qwen3.7 Plus", org: "Qwen", coding: 91, reasoning: 91, agent: 89, multimodal: 86, speed: 91, use: "中文、工具调用与高性价比" },
  { id: "deepseek/deepseek-v3.2", shortName: "DeepSeek V3.2", org: "DeepSeek", coding: 92, reasoning: 91, agent: 88, multimodal: 70, speed: 90, use: "编码与批量文本任务" },
  { id: "moonshotai/kimi-k2.7-code", shortName: "Kimi K2.7 Code", org: "Moonshot AI", coding: 94, reasoning: 90, agent: 92, multimodal: 76, speed: 86, use: "仓库级编码与 Agent" },
  { id: "z-ai/glm-5.2", shortName: "GLM 5.2", org: "Z.ai", coding: 90, reasoning: 92, agent: 90, multimodal: 83, speed: 85, use: "中文推理与工作流" },
] as const;

const fallbackPricing: Record<string, { input: number; output: number; context: number }> = {
  "openai/gpt-5.6-sol": { input: 5, output: 30, context: 1_050_000 },
  "anthropic/claude-sonnet-5": { input: 2, output: 10, context: 1_000_000 },
  "google/gemini-3.6-flash": { input: 1.5, output: 7.5, context: 1_048_576 },
  "qwen/qwen3.7-plus": { input: .32, output: 1.28, context: 1_000_000 },
  "deepseek/deepseek-v3.2": { input: .269, output: .4, context: 163_840 },
  "moonshotai/kimi-k2.7-code": { input: .82, output: 3.75, context: 262_144 },
  "z-ai/glm-5.2": { input: .7938, output: 2.4948, context: 1_048_576 },
};

export async function GET() {
  let catalog: OpenRouterModel[] = [];
  let source = "OpenRouter snapshot";
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
    catalog = (await response.json()).data || [];
    source = "OpenRouter live catalog";
  } catch {
    catalog = [];
  }

  const models = editorial.map((model) => {
    const live = catalog.find((item) => item.id === model.id);
    const fallback = fallbackPricing[model.id];
    const input = live?.pricing?.prompt ? Number(live.pricing.prompt) * 1_000_000 : fallback.input;
    const output = live?.pricing?.completion ? Number(live.pricing.completion) * 1_000_000 : fallback.output;
    const context = live?.context_length || fallback.context;
    const overall = Math.round((model.coding + model.reasoning + model.agent + model.multimodal + model.speed) / 5);
    return { ...model, name: live?.name?.replace(/^[^:]+:\s*/, "") || model.shortName, input, output, context, overall, sourceUrl: `https://openrouter.ai/${model.id}` };
  });

  return NextResponse.json({ ok: true, data: models, source, pricingUnit: "USD / 1M tokens", capabilitySource: "Creator City editorial evaluation sample", fetchedAt: new Date().toISOString() });
}
