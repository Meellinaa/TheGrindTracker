import { useEffect, useState, useCallback } from "react";
import type { AppStatus, Job } from "@/data/jobs";

export type ResumeFile = { name: string; dataUrl: string; size: number };
export type TimelineEvent = { date: string; status: AppStatus; note?: string };

export type JobState = {
  status: AppStatus;
  resumeReady: boolean;
  opensOn?: string;
  closesOn?: string;
  appliedOn?: string;
  notes?: string;
  resumeFile?: ResumeFile;
  timeline?: TimelineEvent[];
};

export type Role = {
  id: string;
  title: string;
  link?: string;
  location?: string;
};

const KEY = "job-tracker-v1";
const CUSTOM_KEY = "job-tracker-custom-v1";
const ROLES_KEY = "job-tracker-roles-v1";

/** Storage key for a role's own tracking state (reuses the same JobState shape). */
export const roleKey = (jobId: string, roleId: string) => `${jobId}::${roleId}`;

const defaultState: JobState = {
  status: "not-started",
  resumeReady: false,
};

export function useJobTracker() {
  const [map, setMap] = useState<Record<string, JobState>>({});
  const [customJobs, setCustomJobs] = useState<Job[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setMap(JSON.parse(raw));
      const rawC = localStorage.getItem(CUSTOM_KEY);
      if (rawC) setCustomJobs(JSON.parse(rawC));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(map));
  }, [map, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CUSTOM_KEY, JSON.stringify(customJobs));
  }, [customJobs, hydrated]);

  const get = useCallback((id: string): JobState => map[id] ?? defaultState, [map]);

  const update = useCallback((id: string, patch: Partial<JobState>) => {
    setMap((prev) => {
      const current = prev[id] ?? defaultState;
      const next: JobState = { ...current, ...patch };
      // auto-timeline on status change
      if (patch.status && patch.status !== current.status) {
        const today = new Date().toISOString().slice(0, 10);
        next.timeline = [...(current.timeline ?? []), { date: today, status: patch.status }];
        if (patch.status === "applied" && !next.appliedOn) next.appliedOn = today;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const addCustomJob = useCallback((job: Omit<Job, "id"> & { id?: string }) => {
    const id = job.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomJobs((prev) => [...prev, { ...job, id } as Job]);
    return id;
  }, []);

  const removeCustomJob = useCallback((id: string) => {
    setCustomJobs((prev) => prev.filter((j) => j.id !== id));
    setMap((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const reset = useCallback(() => setMap({}), []);

  return { get, update, reset, addCustomJob, removeCustomJob, customJobs, map, hydrated };
}
