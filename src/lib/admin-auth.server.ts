import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Privileged handlers must use explicit global roles, never editable identity fields. */
export async function requireGlobalAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Unable to verify administrator access.");
  if (!data) throw new Error("Forbidden: Global administrator access required.");
}

export async function requireBatchManager(userId: string, batchId: string) {
  const { data: role, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError) throw new Error("Unable to verify access.");
  if (role) return;
  const { data, error } = await supabaseAdmin
    .from("batch_memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("batch_id", batchId)
    .eq("status", "approved")
    .maybeSingle();
  if (error || !data || !["mod", "admin"].includes(data.role))
    throw new Error("Only batch moderators and administrators can import notices.");
}

export async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) return users;
  }
}
