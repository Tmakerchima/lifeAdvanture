import { getAuthenticatedContext } from "../../../lib/auth";
import { shanghaiDate } from "../../../lib/recommendations";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAuthenticatedContext();
  if (!context) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { supabase, user } = context;
  const date = shanghaiDate();
  const [profileResult, entriesResult, logsResult, recommendationResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("life_entries")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("energy_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("daily_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .eq("recommendation_date", date)
        .maybeSingle(),
    ]);

  const firstError =
    profileResult.error ??
    entriesResult.error ??
    logsResult.error ??
    recommendationResult.error;
  if (firstError) {
    return Response.json(
      { error: "DATABASE_NOT_READY", detail: firstError.message },
      { status: 503 },
    );
  }

  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return Response.json({
    user: {
      id: user.id,
      email: user.email ?? "",
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "冒险者",
      avatar: user.user_metadata?.avatar_url ?? "",
    },
    profile: profileResult.data,
    entries: entriesResult.data ?? [],
    energyLogs: logsResult.data ?? [],
    recommendation: recommendationResult.data,
  });
}
