import { getAuthenticatedContext } from "../../../lib/auth";

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function list(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item, 60))
    .filter(Boolean)
    .slice(0, 20);
}

export async function PUT(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const payload = {
    user_id: context.user.id,
    display_name: text(body.display_name, 80),
    city: text(body.city, 80),
    life_stage: text(body.life_stage, 120),
    about_me: text(body.about_me, 1200),
    interests: list(body.interests),
    core_values: list(body.core_values),
    preferred_pace: text(body.preferred_pace, 40) || "balanced",
    energy_budget: Math.min(
      5,
      Math.max(1, Math.round(Number(body.energy_budget) || 3)),
    ),
    last_active_at: new Date().toISOString(),
  };

  const { data, error } = await context.supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    return Response.json(
      { error: "PROFILE_SAVE_FAILED", detail: error.message },
      { status: 400 },
    );
  }
  return Response.json(data);
}
