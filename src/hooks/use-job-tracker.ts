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

export type ApplicationStatus =
  | "applied"
  | "screen"
  | "interviewing"
  | "interviewed"
  | "final-round"
  | "offer"
  | "rejected";

export type InterviewLog = {
  questionsAsked: string;
  wentWell: string;
  changeNextTime: string;
};

export type Application = {
  id: string;
  sourceKey?: string;
  company: string;
  role: string;
  requirementId: string;
  dateApplied: string;
  deadline: string;
  status: ApplicationStatus;
  interviewed: boolean;
  resumeFileName: string;
  contact: string;
  lastFollowUpDate: string;
  eligibility: string;
  notes: string;
  responseDate: string;
  interviewLog: InterviewLog;
};

const KEY = "job-tracker-v1";
const CUSTOM_KEY = "job-tracker-custom-v1";
const ROLES_KEY = "job-tracker-roles-v1";
const APPLICATIONS_KEY = "job-tracker-applications-v2";
const CONVERTED_KEY = "job-tracker-converted-companies-v2";
const MIGRATION_KEY = "job-tracker-applications-migrated-v2";
const WEEKLY_GOAL_KEY = "job-tracker-weekly-goal-v2";

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
  const [applications, setApplications] = useState<Application[]>([]);
  const [convertedCompanyIds, setConvertedCompanyIds] = useState<string[]>([]);
  const [applicationsMigrated, setApplicationsMigrated] = useState(false);
  const [weeklyGoal, setWeeklyGoalState] = useState(5);
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
      const rawA = localStorage.getItem(APPLICATIONS_KEY);
      if (rawA) setApplications(JSON.parse(rawA));
      const rawConverted = localStorage.getItem(CONVERTED_KEY);
      if (rawConverted) setConvertedCompanyIds(JSON.parse(rawConverted));
      setApplicationsMigrated(localStorage.getItem(MIGRATION_KEY) === "true");
      const rawGoal = localStorage.getItem(WEEKLY_GOAL_KEY);
      if (rawGoal) setWeeklyGoalState(Number(rawGoal) || 5);
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

  useEffect(() => {
    if (hydrated) persist(APPLICATIONS_KEY, applications);
  }, [applications, hydrated]);

  useEffect(() => {
    if (hydrated) persist(CONVERTED_KEY, convertedCompanyIds);
  }, [convertedCompanyIds, hydrated]);

  useEffect(() => {
    if (hydrated) persist(WEEKLY_GOAL_KEY, weeklyGoal);
  }, [weeklyGoal, hydrated]);

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

  const addApplication = useCallback((application: Omit<Application, "id"> & { id?: string }) => {
    const id = application.id ?? `application-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setApplications((prev) => [...prev, { ...application, id }]);
    return id;
  }, []);

  const updateApplication = useCallback((id: string, patch: Partial<Omit<Application, "id">>) => {
    setApplications((prev) => prev.map((application) => application.id === id ? { ...application, ...patch } : application));
  }, []);

  const completeApplicationMigration = useCallback((records: Application[], companyIds: string[]) => {
    setApplications((prev) => prev.length > 0 ? prev : records);
    setConvertedCompanyIds((prev) => Array.from(new Set([...prev, ...companyIds])));
    setApplicationsMigrated(true);
    try {
      localStorage.setItem(MIGRATION_KEY, "true");
    } catch {}
  }, []);

  const setWeeklyGoal = useCallback((goal: number) => {
    setWeeklyGoalState(Math.max(1, Math.round(goal)));
  }, []);

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
    applications,
    convertedCompanyIds,
    applicationsMigrated,
    weeklyGoal,
    addApplication,
    updateApplication,
    completeApplicationMigration,
    setWeeklyGoal,
  };
}
