import { db as supabase } from "@/lib/backend";
import type { Tables } from "@/integrations/supabase/types";

export type Batch = Tables<"batches">;
export type Membership = Tables<"batch_memberships">;
export type Course = Tables<"courses">;
export type ClassSession = Tables<"class_sessions">;
export type AttendanceMark = Tables<"attendance_marks">;
export type EmailIngest = Tables<"email_ingest">;

export type BatchNode = Batch & {
  programme_name: string;
  programme_slug?: string;
  school_name: string;
  school_slug?: string;
  institution_name: string;
  institution_slug?: string;
  path: string;
};

export const BATCH_STORAGE_KEY = "mahe.batch";

/** Formats database batch names like "MAHE TAPMI - IPM 1 (2026–2031)" into clean labels. */
export function formatBatchLabel(batch: { name: string; start_year?: number | null; end_year?: number | null }) {
  const cleaned = batch.name.replace(/^MAHE\s+TAPMI\s*-\s*/i, "").trim();
  const match = cleaned.match(/^(IPM\s*\d+)(?:\s*\((.*?)\))?/i);
  const code = match?.[1] ? match[1].toUpperCase() : cleaned;
  const years = batch.start_year && batch.end_year 
    ? `${batch.start_year}–${batch.end_year}`
    : match?.[2] || "";
  return { code, full: cleaned, years };
}

/** Full hierarchy flattened to selectable batches. */
export const batchTreeQuery = {
  queryKey: ["batch-tree"],
  queryFn: async (): Promise<BatchNode[]> => {
    const { data, error } = await supabase
      .from("batches")
      .select(
        "*, programmes!inner(name, slug, schools!inner(name, slug, institutions!inner(name, slug)))",
      )
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const programme = row.programmes as unknown as {
        name: string;
        slug?: string;
        schools: { name: string; slug?: string; institutions: { name: string; slug?: string } };
      };
      const { programmes: _drop, ...batch } = row as typeof row & {
        programmes: unknown;
      };
      const institution_name = programme.schools.institutions.name;
      const institution_slug = programme.schools.institutions.slug;
      const school_name = programme.schools.name;
      const school_slug = programme.schools.slug;
      return {
        ...(batch as Batch),
        programme_name: programme.name,
        programme_slug: programme.slug,
        school_name,
        school_slug,
        institution_name,
        institution_slug,
        path: `${institution_name} · ${school_name}`,
      };
    });
  },
};

export function myMembershipsQuery(userId: string | undefined) {
  return {
    queryKey: ["my-memberships", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("batch_memberships")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function batchMembersQuery(batchId: string | null, enabled: boolean) {
  return {
    queryKey: ["batch-members", batchId],
    enabled: !!batchId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batch_memberships")
        .select("*, profiles:user_id(full_name, email)")
        .eq("batch_id", batchId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as (Membership & {
        profiles: { full_name: string | null; email: string | null } | null;
      })[];
    },
  };
}

export function coursesQuery(batchId: string | null) {
  return {
    queryKey: ["courses", batchId],
    enabled: !!batchId,
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("batch_id", batchId!)
        .order("short_name");
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function sessionsQuery(batchId: string | null) {
  return {
    queryKey: ["class-sessions", batchId],
    enabled: !!batchId,
    queryFn: async (): Promise<ClassSession[]> => {
      const { data, error } = await supabase
        .from("class_sessions")
        .select("*")
        .eq("batch_id", batchId!)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function attendanceQuery(batchId: string | null, enabled: boolean) {
  return {
    queryKey: ["attendance", batchId],
    enabled: !!batchId && enabled,
    queryFn: async (): Promise<AttendanceMark[]> => {
      const { data, error } = await supabase
        .from("attendance_marks")
        .select("*")
        .eq("batch_id", batchId!);
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function emailQueueQuery(batchId: string | null, enabled: boolean) {
  return {
    queryKey: ["email-ingest", batchId],
    enabled: !!batchId && enabled,
    queryFn: async (): Promise<EmailIngest[]> => {
      const { data, error } = await supabase
        .from("email_ingest")
        .select("*")
        .eq("batch_id", batchId!)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function syncStateQuery(batchId: string | null, enabled: boolean) {
  return {
    queryKey: ["sync-state", batchId],
    enabled: !!batchId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batch_sync_state")
        .select("*")
        .eq("batch_id", batchId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  };
}

/** Every membership the viewer is allowed to see — used by the Members list so
 *  people can find batchmates and see who runs which batch. */
export type DirectoryRow = Membership & {
  profiles: {
    full_name: string | null;
    email: string | null;
    section: string | null;
    registration_no: string | null;
  } | null;
  batches: { name: string } | null;
};

export function directoryQuery(enabled: boolean) {
  return {
    queryKey: ["member-directory"],
    enabled,
    queryFn: async (): Promise<DirectoryRow[]> => {
      const { data, error } = await supabase
        .from("batch_memberships")
        .select(
          "*, profiles:user_id(full_name, email, section, registration_no), batches:batch_id(name)",
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DirectoryRow[];
    },
  };
}
