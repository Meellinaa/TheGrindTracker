import { useEffect, useState, useCallback } from "react";
import type { AppStatus, Job } from "@/data/jobs";
import { saveResumeData, loadResumeData, deleteResumeData } from "@/lib/resume-store";

/** Strip big base64 payloads before writing to localStorage (files live in IndexedDB). */
const stripForStorage = (s: JobState): JobState =>
  s.resumeFile ? { ...s, resumeFile: { ...s.resumeFile, dataUrl: "" } } : s;

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
  const [rolesByJob, setRolesByJob] = useState<Record<string, Role[]>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const stored: Record<string, JobState> = JSON.parse(raw);
        setMap(stored);
        // Re-attach resume payloads from IndexedDB; migrate any still inline.
        for (const [id, st] of Object.entries(stored)) {
          if (!st.resumeFile) continue;
          if (st.resumeFile.dataUrl) {
            saveResumeData(id, st.resumeFile.dataUrl).catch(() => {});
          } else {
            loadResumeData(id)
              .then((dataUrl) => {
                if (!dataUrl) return;
                setMap((prev) => {
                  const current = prev[id];
                  if (!current?.resumeFile) return prev;
                  return { ...prev, [id]: { ...current, resumeFile: { ...current.resumeFile, dataUrl } } };
                });
              })
              .catch(() => {});
          }
        }
      }
      const rawC = localStorage.getItem(CUSTOM_KEY);
      if (rawC) setCustomJobs(JSON.parse(rawC));
      const rawR = localStorage.getItem(ROLES_KEY);
      if (rawR) setRolesByJob(JSON.parse(rawR));
    } catch {}
    setHydrated(true);
  }, []);

  const persist = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      alert("Your browser storage is full — try deleting an old resume file. 💗");
    }
  };

  useEffect(() => {
    if (hydrated) {
      const stripped: Record<string, JobState> = {};
      for (const [k, v] of Object.entries(map)) stripped[k] = stripForStorage(v);
      persist(KEY, stripped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, hydrated]);

  useEffect(() => {
    if (hydrated) persist(CUSTOM_KEY, customJobs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customJobs, hydrated]);

  useEffect(() => {
    if (hydrated) persist(ROLES_KEY, rolesByJob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesByJob, hydrated]);

  const get = useCallback((id: string): JobState => map[id] ?? defaultState, [map]);

  const update = useCallback((id: string, patch: Partial<JobState>) => {
    if ("resumeFile" in patch) {
      if (patch.resumeFile?.dataUrl) saveResumeData(id, patch.resumeFile.dataUrl).catch(() => {});
      if (!patch.resumeFile) deleteResumeData(id).catch(() => {});
    }
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
    deleteResumeData(id).catch(() => {});
    setMap((prev) => {
      const rest: Record<string, JobState> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k !== id && !k.startsWith(`${id}::`)) rest[k] = v;
        else if (k.startsWith(`${id}::`)) deleteResumeData(k).catch(() => {});
      }
      return rest;
    });
    setRolesByJob((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const rolesOf = useCallback((jobId: string): Role[] => rolesByJob[jobId] ?? [], [rolesByJob]);

  const addRole = useCallback((jobId: string, role: Omit<Role, "id">) => {
    const id = `role-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRolesByJob((prev) => ({ ...prev, [jobId]: [...(prev[jobId] ?? []), { ...role, id }] }));
    return id;
  }, []);

  const updateRole = useCallback((jobId: string, roleId: string, patch: Partial<Omit<Role, "id">>) => {
    setRolesByJob((prev) => ({
      ...prev,
      [jobId]: (prev[jobId] ?? []).map((r) => (r.id === roleId ? { ...r, ...patch } : r)),
    }));
  }, []);

  const removeRole = useCallback((jobId: string, roleId: string) => {
    setRolesByJob((prev) => ({ ...prev, [jobId]: (prev[jobId] ?? []).filter((r) => r.id !== roleId) }));
    deleteResumeData(roleKey(jobId, roleId)).catch(() => {});
    setMap((prev) => {
      const { [roleKey(jobId, roleId)]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const reset = useCallback(() => setMap({}), []);

  return {
    get,
    update,
    reset,
    addCustomJob,
    removeCustomJob,
    customJobs,
    rolesByJob,
    rolesOf,
    addRole,
    updateRole,
    removeRole,
    map,
    hydrated,
  };
}
