import type { SupabaseClient } from "@supabase/supabase-js";
import { createQwenRecommendation } from "./qwen";

export function shanghaiDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function generateDailyRecommendation(
  supabase: SupabaseClient,
  userId: string,
  force = false,
) {
  const date = shanghaiDate();

  if (!force) {
    const { data: existing } = await supabase
      .from("daily_recommendations")
      .select("*")
      .eq("user_id", userId)
      .eq("recommendation_date", date)
      .maybeSingle();
    if (existing) return existing;
  }

  const [profileResult, entriesResult, logsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("life_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("energy_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const firstError =
    profileResult.error ?? entriesResult.error ?? logsResult.error;
  if (firstError) throw firstError;

  const recommendation = await createQwenRecommendation({
    date,
    profile: profileResult.data,
    entries: entriesResult.data ?? [],
    energyLogs: logsResult.data ?? [],
  });
  const model = process.env.QWEN_MODEL ?? "qwen-plus";

  const { data, error } = await supabase
    .from("daily_recommendations")
    .upsert(
      {
        user_id: userId,
        recommendation_date: date,
        ...recommendation,
        model,
        context_snapshot: {
          profile_updated_at: profileResult.data?.updated_at ?? null,
          entry_count: entriesResult.data?.length ?? 0,
          energy_log_count: logsResult.data?.length ?? 0,
        },
      },
      { onConflict: "user_id,recommendation_date" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
