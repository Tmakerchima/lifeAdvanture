import { getAuthenticatedContext } from "../../../lib/auth";

const kinds = new Set(["thought", "dilemma", "goal", "reflection"]);
const statuses = new Set(["active", "completed", "archived"]);

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const kind = text(body.kind, 20);
  const title = text(body.title, 120);
  const content = text(body.content, 4000);
  if (!kinds.has(kind) || !title || !content) {
    return Response.json({ error: "INVALID_ENTRY" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("life_entries")
    .insert({
      user_id: context.user.id,
      kind,
      title,
      content,
      priority: Math.min(
        5,
        Math.max(1, Math.round(Number(body.priority) || 3)),
      ),
      target_date: body.target_date || null,
    })
    .select("*")
    .single();

  if (error) {
    return Response.json(
      { error: "ENTRY_SAVE_FAILED", detail: error.message },
      { status: 400 },
    );
  }
  return Response.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = text(body.id, 80);
  const status = text(body.status, 20);
  if (!id || !statuses.has(status)) {
    return Response.json({ error: "INVALID_ENTRY_UPDATE" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("life_entries")
    .update({ status })
    .eq("id", id)
    .eq("user_id", context.user.id)
    .select("*")
    .single();

  if (error) {
    return Response.json(
      { error: "ENTRY_UPDATE_FAILED", detail: error.message },
      { status: 400 },
    );
  }
  return Response.json(data);
}
