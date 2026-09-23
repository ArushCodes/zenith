import { supabase } from "@/integrations/supabase/client";

/** Backend is always reachable: env-injected when available, public fallback otherwise. */
export const backendConfigured = true;

/** Supabase client that never throws for a missing build-time env var. */
export const db = supabase;
