import { NextResponse } from "next/server";

type AnalyzeRequest = {
  assetName?: string;
  purpose?: string;
  comment?: string;
  project?: { name?: string; desc?: string; role?: string; impact?: string; highlights?: string[] };
  experience?: { organization?: string; role?: string; summary?: string; highlights?: string[] };
  profile?: {
    name?: string;
    title?: string;
    bio?: string;
    narrative?: string;
    resume?: string;
    metrics?: Array<{ label?: string; value?: string; context?: string }>;
    skills?: Array<{ name?: string; evidence?: string }>;
  };
  frames?: string[];
};

const phases = ["hook", "context", "action", "evidence", "result", "reflection"];

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  if (!Array.isArray(payload.output)) return "";
  for (const item of payload.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
    }
  }
  return "";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, code: "MODEL_NOT_CONFIGURED", error: "未配置视觉分析模型，已切换为本地叙事草稿" }, { status: 503 });

  let input: AnalyzeRequest;
  try {
    input = await request.json() as AnalyzeRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式无效" }, { status: 400 });
  }

  const frames = Array.isArray(input.frames) ? input.frames.filter((frame) => typeof frame === "string" && frame.startsWith("data:image/")).slice(0, 4) : [];
  if (!frames.length) return NextResponse.json({ ok: false, error: "没有可分析的代表帧" }, { status: 400 });

  const context = {
    assetName: input.assetName || "未命名素材",
    purpose: input.purpose || "demo",
    comment: input.comment || "",
    project: input.project || null,
    experience: input.experience || null,
    profile: input.profile || null,
  };
  const prompt = [
    "你是个人作品集视频的导演与剪辑规格设计师。请分析按时间排序的代表帧，并把用户的素材评论、项目说明、角色、结果、简历叙事和技能证据编排成六段中文 edit spec。",
    "必须忠于画面；看不清或无法确认的内容不要虚构数字、功能或结果。用户评论是素材含义的第一手说明，优先级最高。",
    "每段 title 必须包含这个项目或经历里的具体名词、动作、结果，禁止连续使用『为什么做』『关键动作』『证据在画面』『最终结果』一类可套用到任何人的空标题。",
    "每段 body 控制在 18 到 54 个汉字。keywords 选择 2 到 5 个来自输入的具体词或数字，不能发明词。",
    "layout：hook 与 reflection 必须 fullscreen；context、action、evidence、result 使用 split，让左侧 Motion 与右侧真实素材共同叙事。",
    "visual 从 kinetic、network、workflow、metric、compare、media-focus 中选择：开场/总结用 kinetic，系统关系用 network，步骤用 workflow，数字结果用 metric，实验前后用 compare，画面证据用 media-focus。避免六段使用相同 visual。",
    "visualCue 必须描述可由 Remotion 帧动画实现的构图、元素和节奏，并明确怎样响应本段关键词；不要只写『淡入』『动态标题』。",
    `六个 phase 必须按顺序为：${phases.join(", ")}。`,
    `上下文：${JSON.stringify(context)}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MEDIA_MODEL || "gpt-5.6-terra",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          ...frames.map((imageUrl) => ({ type: "input_image", image_url: imageUrl, detail: "low" })),
        ],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "media_narrative",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "beats"],
            properties: {
              summary: { type: "string" },
              beats: {
                type: "array",
                minItems: 6,
                maxItems: 6,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["phase", "title", "body", "visualCue", "layout", "visual", "keywords"],
                  properties: {
                    phase: { type: "string", enum: phases },
                    title: { type: "string" },
                    body: { type: "string" },
                    visualCue: { type: "string" },
                    layout: { type: "string", enum: ["fullscreen", "split"] },
                    visual: { type: "string", enum: ["kinetic", "network", "workflow", "metric", "compare", "media-focus"] },
                    keywords: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const apiError = payload.error && typeof payload.error === "object" ? (payload.error as { message?: string }).message : undefined;
    return NextResponse.json({ ok: false, error: apiError || "视觉分析失败" }, { status: response.status });
  }

  try {
    const result = JSON.parse(extractOutputText(payload));
    return NextResponse.json({ ok: true, data: result });
  } catch {
    return NextResponse.json({ ok: false, error: "模型返回的叙事格式无效" }, { status: 502 });
  }
}
