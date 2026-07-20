import { useEffect, useState, useCallback } from "react";
import type { AppStatus } from "@/data/jobs";

export type JobState = {
  status: AppStatus;
  resumeReady: boolean;
  opensOn?: string;
  closesOn?: string;
  appliedOn?: string;
  notes?: string;
};

const KEY = "job-tracker-v1";

const defaultState: JobState = {
  status: "not-started",
  resumeReady: false,
};

export function useJobTracker() {
  const [map, setMap] = useState<Record<string, JobState>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setMap(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(map));
  }, [map, hydrated]);

  const get = useCallback((id: string): JobState => map[id] ?? defaultState, [map]);

  const update = useCallback((id: string, patch: Partial<JobState>) => {
    setMap((prev) => ({ ...prev, [id]: { ...(prev[id] ?? defaultState), ...patch } }));
  }, []);

  const reset = useCallback(() => setMap({}), []);

  return { get, update, reset, map, hydrated };
}
