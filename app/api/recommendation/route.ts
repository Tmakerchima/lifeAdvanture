import { getAuthenticatedContext } from "../../../lib/auth";
import { generateDailyRecommendation } from "../../../lib/recommendations";

export const maxDuration = 45;

export async function POST(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };
    const data = await generateDailyRecommendation(
      context.supabase,
      context.user.id,
      body.force === true,
    );
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const notConfigured = message.includes("QWEN_NOT_CONFIGURED");
    return Response.json(
      {
        error: notConfigured
          ? "QWEN_NOT_CONFIGURED"
          : "RECOMMENDATION_FAILED",
        detail: notConfigured ? undefined : message.slice(0, 300),
      },
      { status: notConfigured ? 503 : 500 },
    );
  }
}
