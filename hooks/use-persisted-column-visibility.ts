import { useEffect, useRef, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";

type UsePersistedColumnVisibilityOptions = {
  storageKey: string;
  initialVisibility?: VisibilityState;
  loadBaseVisibility?: VisibilityState;
};

export function usePersistedColumnVisibility({
  storageKey,
  initialVisibility,
  loadBaseVisibility,
}: UsePersistedColumnVisibilityOptions) {
  const initialRef = useRef<VisibilityState>(initialVisibility ?? {});
  const loadBaseRef = useRef<VisibilityState | undefined>(loadBaseVisibility);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialRef.current,
  );
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    const initial = initialRef.current;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setIsStorageReady(true);
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") {
        setIsStorageReady(true);
        return;
      }

      const persisted: VisibilityState = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "boolean") {
          persisted[key] = value;
        }
      }

      if (Object.keys(persisted).length > 0) {
        setColumnVisibility({
          ...(loadBaseRef.current ?? {}),
          ...initial,
          ...persisted,
        });
      }
    } catch {
      // ignore malformed localStorage values
    } finally {
      setIsStorageReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isStorageReady) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch {
      // ignore localStorage write failures
    }
  }, [columnVisibility, isStorageReady, storageKey]);

  return [columnVisibility, setColumnVisibility] as const;
}
