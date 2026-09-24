import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  BATCH_STORAGE_KEY,
  batchTreeQuery,
  myMembershipsQuery,
  type BatchNode,
  type Membership,
} from "@/lib/batches";

type BatchContextValue = {
  batches: BatchNode[];
  batch: BatchNode | null;
  batchId: string | null;
  setBatchId: (id: string) => void;
  membership: Membership | null;
  memberships: Membership[];
  isMember: boolean;
  isPending: boolean;
  canManage: boolean;
  loading: boolean;
};

const BatchContext = createContext<BatchContextValue | null>(null);

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const { data: allBatches = [], isLoading } = useQuery({
    ...batchTreeQuery,
    enabled: !!user,
  });
  const { data: memberships = [] } = useQuery(myMembershipsQuery(user?.id));

  /** Students only ever see the batch(es) they belong to; global admins see everything. */
  const batches = useMemo(() => {
    if (isAdmin) return allBatches;
    const mine = new Set(
      memberships.filter((m) => m.status === "approved").map((m) => m.batch_id),
    );
    return allBatches.filter((b) => mine.has(b.id));
  }, [allBatches, memberships, isAdmin]);

  const userMetadataBatch = (user?.user_metadata as Record<string, any> | undefined)?.["batch_id"];
  const [batchId, setBatchIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(BATCH_STORAGE_KEY);
    if (stored) return stored;
    if (userMetadataBatch && typeof userMetadataBatch === "string") return userMetadataBatch;
    return null;
  });

  // Restore the last batch before the batch tree arrives so batch-scoped
  // queries can start in parallel instead of waiting on it.
  useEffect(() => {
    if (batchId) return;
    const stored = window.localStorage.getItem(BATCH_STORAGE_KEY);
    if (stored) {
      setBatchIdState(stored);
      return;
    }
    const metaBatch = (user?.user_metadata as Record<string, any> | undefined)?.["batch_id"];
    if (metaBatch && typeof metaBatch === "string") {
      setBatchIdState(metaBatch);
      try {
        window.localStorage.setItem(BATCH_STORAGE_KEY, metaBatch);
      } catch {}
    }
  }, [batchId, user]);

  useEffect(() => {
    if (batches.length === 0) return;
    if (batchId && batches.some((b) => b.id === batchId)) return;
    const mine = memberships.find((m) => m.status === "approved");
    const next =
      (mine && batches.find((b) => b.id === mine.batch_id)?.id) ?? batches[0]!.id;
    setBatchIdState(next);
    try {
      window.localStorage.setItem(BATCH_STORAGE_KEY, next);
    } catch {}
  }, [batchId, batches, memberships]);

  function setBatchId(id: string) {
    setBatchIdState(id);
    try {
      window.localStorage.setItem(BATCH_STORAGE_KEY, id);
    } catch {}
  }

  const value = useMemo<BatchContextValue>(() => {
    const activeBatch =
      batches.find((b) => b.id === batchId) ?? (batches.length === 1 ? batches[0]! : null);
    const resolvedBatchId = activeBatch?.id ?? batchId ?? (batches[0]?.id ?? null);
    const membership = memberships.find((m) => m.batch_id === resolvedBatchId) ?? null;
    const approved = membership?.status === "approved";
    return {
      batches,
      batch: activeBatch,
      batchId: resolvedBatchId,
      setBatchId,
      membership,
      memberships,
      isMember: approved || isAdmin,
      isPending: membership?.status === "pending",
      canManage:
        isAdmin || (approved && (membership?.role === "mod" || membership?.role === "admin")),
      loading: isLoading,
    };
  }, [batches, batchId, memberships, isAdmin, isLoading]);


  return <BatchContext.Provider value={value}>{children}</BatchContext.Provider>;
}

export function useBatch() {
  const ctx = useContext(BatchContext);
  if (!ctx) throw new Error("useBatch must be used inside BatchProvider");
  return ctx;
}
