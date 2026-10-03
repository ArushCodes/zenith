import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import confetti from "canvas-confetti";

export function usePersonalChecklist(batchId: string | null) {
  const { user } = useAuth();
  const key = `zenith.done_deadlines.${user?.id || "guest"}.${batchId || "global"}`;

  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Keep in sync across tabs or when batchId changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      setDoneMap(raw ? JSON.parse(raw) : {});
    } catch {
      setDoneMap({});
    }
  }, [key]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setDoneMap(event.newValue ? JSON.parse(event.newValue) : {});
      } catch {
        setDoneMap({});
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  const toggleDone = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setDoneMap((prev) => {
        const currentlyDone = !prev[id];
        const next = { ...prev, [id]: currentlyDone };

        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* Storage may be unavailable in private browsing. */
        }

        if (currentlyDone) {
          try {
            const rect = e?.currentTarget?.getBoundingClientRect?.();
            const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
            const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.5;

            confetti({
              particleCount: 40,
              spread: 55,
              origin: { x, y },
              colors: ["#06b6d4", "#10b981", "#8b5cf6", "#f59e0b"],
              disableForReducedMotion: true,
            });
          } catch {
            /* Storage may be unavailable in private browsing. */
          }
        }

        return next;
      });
    },
    [key],
  );

  const isDone = useCallback((id: string) => !!doneMap[id], [doneMap]);

  return { doneMap, isDone, toggleDone };
}
