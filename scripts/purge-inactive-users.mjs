import { createRequire } from "module";
import fs from "fs";

const require = createRequire(process.cwd() + "/package.json");
const { createClient } = require("@supabase/supabase-js");

// Read .env
const envFile = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Fetching all users from Supabase Auth...");
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }

  const users = data.users;
  const neverLoggedIn = users.filter((u) => {
    if (u.last_sign_in_at) return false;
    const em = (u.email || "").toLowerCase();
    // Safety guard for admin Arush
    if (em === "arush.tapmimpl2026@learner.manipal.edu" || em.includes("admin@")) return false;
    return true;
  });

  console.log(`Found ${neverLoggedIn.length} users who have never logged in.`);
  if (neverLoggedIn.length === 0) {
    console.log("No inactive users to purge.");
    return;
  }

  const ids = neverLoggedIn.map((u) => u.id);

  console.log("Deleting associated records from batch_memberships and profiles...");
  await supabase.from("batch_memberships").delete().in("user_id", ids);
  await supabase.from("profiles").delete().in("id", ids);

  console.log("Purging users from Supabase Auth...");
  let successCount = 0;
  for (const u of neverLoggedIn) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.error(`Failed to delete ${u.email}:`, delErr.message);
    } else {
      successCount++;
      console.log(`Deleted user: ${u.email}`);
    }
  }

  console.log(`\nPurge complete! Successfully removed ${successCount} users.`);
}

run().catch(console.error);
