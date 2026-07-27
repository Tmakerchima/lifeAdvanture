import type { EnergyLog, LifeEntry, LifeProfile } from "./life-types";

export type QwenRecommendation = {
  quest_title: string;
  quest_description: string;
  rationale: string;
  coaching_note: string;
  reflection_question: string;
  quest_type: string;
  xp: number;
  minutes: number;
};

type RecommendationContext = {
  date: string;
  profile: LifeProfile | null;
  entries: LifeEntry[];
  energyLogs: EnergyLog[];
};

function extractJson(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("QWEN_INVALID_JSON");
  return value.slice(start, end + 1);
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function createQwenRecommendation(
  context: RecommendationContext,
): Promise<QwenRecommendation> {
  const apiKey = process.env.QWEN_API_KEY;
  const baseUrl =
    process.env.QWEN_BASE_URL ??
    "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = process.env.QWEN_MODEL ?? "qwen-plus";

  if (!apiKey) throw new Error("QWEN_NOT_CONFIGURED");

  const systemPrompt = `
你是一位严谨、温和、富有好奇心的人生设计教练。你使用 Stanford Designing Your Life
的设计思维：好奇、重构问题、并行人生、低成本原型、行动偏好与失败复盘。

你的任务是为当前用户设计“今天唯一值得完成的小任务”，而不是提供泛泛建议。
必须遵守：
- 只使用给出的个人资料、目标、困境、想法和能量记录；不编造用户偏好。
- 不假设用户喜欢游戏、旅行、上班、创业或恋爱，除非上下文明确支持。
- 任务应可逆、具体、低风险，通常 15–90 分钟，并在现实世界产生新信息。
- 同时尊重用户的精力、工作、关系和休息；不要把人生变成效率竞赛。
- 对医疗、心理危机、法律和财务问题，不做诊断或高风险指令。
- 输出合法 JSON，不输出 Markdown，不解释 JSON 之外的内容。

JSON 格式：
{
  "quest_title": "14字以内的任务名",
  "quest_description": "具体到今天可以执行的步骤",
  "rationale": "为什么它适合这个用户此刻的处境",
  "coaching_note": "一句温和但不空洞的教练提示",
  "reflection_question": "完成后只需回答的一个问题",
  "quest_type": "explore|create|connect|reflect|move|work|love|rest",
  "xp": 20,
  "minutes": 30
}`.trim();

  const userPrompt = `
今天日期：${context.date}

用户上下文（JSON）：
${JSON.stringify({
  profile: context.profile
    ? {
        display_name: context.profile.display_name,
        city: context.profile.city,
        life_stage: context.profile.life_stage,
        about_me: context.profile.about_me,
        interests: context.profile.interests,
        core_values: context.profile.core_values,
        preferred_pace: context.profile.preferred_pace,
        energy_budget: context.profile.energy_budget,
      }
    : null,
  active_entries: context.entries.map((entry) => ({
    kind: entry.kind,
    title: entry.title,
    content: entry.content,
    priority: entry.priority,
    target_date: entry.target_date,
  })),
  recent_energy_logs: context.energyLogs.map((log) => ({
    activity: log.activity,
    energy: log.energy,
    engagement: log.engagement,
    note: log.note,
  })),
})}

根据这些真实信息生成今天的唯一任务。信息不足时，任务应帮助用户获得更多自我认知，
不要擅自替用户定义人生方向。`.trim();

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.72,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`QWEN_REQUEST_FAILED:${response.status}:${detail}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
  const allowedTypes = new Set([
    "explore",
    "create",
    "connect",
    "reflect",
    "move",
    "work",
    "love",
    "rest",
  ]);
  const questType = clean(parsed.quest_type, 20);

  return {
    quest_title: clean(parsed.quest_title, 40) || "完成一个小实验",
    quest_description:
      clean(parsed.quest_description, 600) ||
      "选择一个你正在犹豫的小问题，用 30 分钟做一次可逆的现实测试。",
    rationale:
      clean(parsed.rationale, 400) || "行动会带来思考无法提供的新信息。",
    coaching_note:
      clean(parsed.coaching_note, 240) || "今天不需要解决整个人生。",
    reflection_question:
      clean(parsed.reflection_question, 240) ||
      "完成后，你获得了什么原来不知道的信息？",
    quest_type: allowedTypes.has(questType) ? questType : "reflect",
    xp: clamp(parsed.xp, 10, 80, 30),
    minutes: clamp(parsed.minutes, 10, 120, 30),
  };
}
