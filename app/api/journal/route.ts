import { getAuthenticatedContext } from "../../../lib/auth";

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const activity = text(body.activity, 240);
  if (!activity) {
    return Response.json({ error: "ACTIVITY_REQUIRED" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("energy_logs")
    .insert({
      user_id: context.user.id,
      activity,
      energy: Math.min(5, Math.max(1, Math.round(Number(body.energy) || 3))),
      engagement: Math.min(
        5,
        Math.max(1, Math.round(Number(body.engagement) || 3)),
      ),
      note: text(body.note, 1000),
    })
    .select("*")
    .single();

  if (error) {
    return Response.json(
      { error: "JOURNAL_SAVE_FAILED", detail: error.message },
      { status: 400 },
    );
  }
  return Response.json(data, { status: 201 });
}
