import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { generateDailyRecommendation } from "../../../../lib/recommendations";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("user_id")
      .order("last_active_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const results: Array<{ userId: string; status: string }> = [];
    for (const profile of profiles ?? []) {
      try {
        await generateDailyRecommendation(admin, profile.user_id, false);
        results.push({ userId: profile.user_id, status: "ok" });
      } catch {
        results.push({ userId: profile.user_id, status: "failed" });
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      succeeded: results.filter((result) => result.status === "ok").length,
      failed: results.filter((result) => result.status === "failed").length,
    });
  } catch (error) {
    return Response.json(
      {
        error: "CRON_FAILED",
        detail: error instanceof Error ? error.message.slice(0, 300) : "Unknown",
      },
      { status: 500 },
    );
  }
}
