import type { MLCEngine } from "@mlc-ai/web-llm";
import { METRIC_METADATA } from "./metrics";
import { DYNAMIC_PLACEHOLDERS as D, type Category, type VisualizationType, type WidgetConfig } from "./model";

/**
 * In-browser widget generation (unified-agent AiWidgetService): a small model runs
 * on WebGPU via WebLLM and turns a prompt into a widget config. The runtime and
 * model weights load only when the agent first generates.
 */
const MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

const SYSTEM_PROMPT = `You are an AI assistant that helps users create dashboard widgets.
Your task is to convert a user's request into a JSON configuration for a widget.
The output MUST be a valid JSON object matching this schema:
{
  "title": "A short descriptive title for the widget",
  "category": "AGENTS" | "CONVERSATIONS" | "QUEUES" | "TEAMS" | "BOTS",
  "metric": "A specific metric ID (e.g., SLA, AWT_AHT, ABANDONED_RATIO, MRD_STATS, AGENT_METRIC_SUMMARY, BOT_SUMMARY)",
  "visualizationType": "KPI" | "PIE" | "BAR" | "LINE" | "TABLE",
  "settings": {
    "queueIds": [],
    "mrdId": "",
    "teamId": ""
  }
}

Guidelines:
- Identify the most appropriate category and visualization type based on the prompt.
- Metrics for QUEUES: SLA, AWT_AHT, ABANDONED_RATIO, ACTIVE_QUEUES, QUEUE_SUMMARY, QUEUE_CHANNEL_SUMMARY, DAILY_CALLS_SUMMARY.
- Metrics for AGENTS: AGENT_METRIC_SUMMARY, AGENT_READY_NOT_READY, AGENT_CONSULT_SUMMARY, AGENT_OCCUPANCY, AGENT_HOURLY_HANDLED.
- Metrics for CONVERSATIONS: MRD_STATS.
- Metrics for TEAMS: AGENT_TEAM_SUMMARY.
- Metrics for BOTS: BOT_ACTIVE_CHATS, BOT_SUMMARY.
- ONLY return the JSON object. Do not add any markdown formatting or extra text.`;

export class AiWidgetError extends Error {
  constructor(readonly code: "UNSUPPORTED" | "INIT_FAILED" | "INVALID_RESPONSE") {
    super(code);
    this.name = "AiWidgetError";
  }
}

let engine: Promise<MLCEngine> | null = null;

export function aiWidgetSupported() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

function getEngine(onProgress: (text: string) => void): Promise<MLCEngine> {
  if (!aiWidgetSupported()) return Promise.reject(new AiWidgetError("UNSUPPORTED"));
  engine ??= import("@mlc-ai/web-llm")
    .then(({ CreateMLCEngine }) =>
      CreateMLCEngine(MODEL, { initProgressCallback: (report) => onProgress(report.text) }),
    )
    .catch((error: unknown) => {
      engine = null; // allow a retry after a failed download/initialisation
      throw error instanceof AiWidgetError ? error : new AiWidgetError("INIT_FAILED");
    });
  return engine;
}

/** First JSON object in the reply (source parseJsonResponse). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end < start) throw new AiWidgetError("INVALID_RESPONSE");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiWidgetError("INVALID_RESPONSE");
  }
}

/**
 * Validates a model reply against the metric catalogue and fills scope settings the
 * model leaves empty with the builder's dynamic defaults, so the preview loads data.
 */
export function normalizeWidgetConfig(value: unknown): WidgetConfig {
  const raw = (value ?? {}) as Partial<WidgetConfig> & { settings?: Record<string, unknown> };
  const category = String(raw.category ?? "").toUpperCase() as Category;
  const metrics = METRIC_METADATA[category];
  const metric = metrics?.find((m) => m.id === String(raw.metric ?? "").toUpperCase());
  if (!metrics || !metric) throw new AiWidgetError("INVALID_RESPONSE");
  const requested = String(raw.visualizationType ?? "").toUpperCase() as VisualizationType;
  const visualizationType = metric.supportedVisuals.includes(requested)
    ? requested
    : metric.supportedVisuals[0]!;
  const s = raw.settings ?? {};
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const queueIds = Array.isArray(s.queueIds)
    ? s.queueIds.filter((q): q is string => typeof q === "string" && q.trim() !== "")
    : [];
  return {
    title: text(raw.title) ?? metric.name,
    category,
    metric: metric.id,
    visualizationType,
    settings: {
      teamId: text(s.teamId) ?? D.CURRENT_TEAM,
      queueIds: queueIds.length ? queueIds : [D.ALL_QUEUES],
      agentId: text(s.agentId) ?? D.CURRENT_AGENT,
      mrdId: text(s.mrdId) ?? D.ALL_MRDS,
      botId: text(s.botId) ?? D.ALL_BOTS,
    },
  };
}

export async function generateWidgetConfig(prompt: string, onProgress: (text: string) => void) {
  const llm = await getEngine(onProgress);
  const reply = await llm.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
  });
  return normalizeWidgetConfig(extractJson(reply.choices[0]?.message.content ?? ""));
}
