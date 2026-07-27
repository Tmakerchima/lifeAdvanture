import { createServerSupabaseClient } from "./supabase/server";

export async function getAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { supabase, user };
}
