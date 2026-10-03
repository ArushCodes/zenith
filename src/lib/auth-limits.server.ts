import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function limitAuthAttempt(action: string, identifier: string) {
  const request = getRequest();
  const ip =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "unknown";
  const bucket = (value: string) => createHash("sha256").update(`${action}:${value}`).digest("hex");
  for (const key of [bucket(ip.split(",")[0]!.trim()), bucket(identifier.toLowerCase())]) {
    const { data, error } = await supabaseAdmin.rpc(
      "consume_auth_attempt" as never,
      { bucket_key: key, max_attempts: action === "login-lookup" ? 30 : 8 } as never,
    );
    if (error)
      throw new Error(
        "Authentication is temporarily unavailable. The server configuration needs attention.",
      );
    if (!data) throw new Error("Too many attempts. Please wait 15 minutes before trying again.");
  }
}
