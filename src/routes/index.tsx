import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { JOBS, STATUS_META, groupOf, type AppStatus, type Job } from "@/data/jobs";
import { useJobTracker, roleKey, type JobState, type Role } from "@/hooks/use-job-tracker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DateField, LabeledInput, ResumeUploader, StatusButtons, STATUSES } from "@/components/track-fields";
import { RolesSection } from "@/components/roles-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Search,
  Download,
  FileCheck2,
  FileX2,
  Heart,
  CalendarDays,
  Plus,
  Trash2,
  Globe,
  Clock,
  Building2,
  Briefcase,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Job Hunt HQ | Application Tracker" },
      {
        name: "description",
        content:
          "Track companies, roles, application dates, notes, and tailored resumes in one organized workspace.",
      },
       { property: "og:title", content: "Job Hunt HQ | Application Tracker" },
      { property: "og:description", content: "Track applications, upload resumes, and log a timeline across your target companies." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Dashboard() {
  const {
    get,
    update,
    addCustomJob,
    removeCustomJob,
    customJobs,
    rolesOf,
    rolesByJob,
    addRole,
    removeRole,
    hydrated,
  } = useJobTracker();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [resumeFilter, setResumeFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const allJobs = useMemo<Job[]>(() => [...customJobs, ...JOBS], [customJobs]);

  const enriched = useMemo(
    () =>
      allJobs.map((j) => {
        const roles = rolesByJob[j.id] ?? [];
        return {
          ...j,
          group: j.id.startsWith("custom-") ? "💖 My Custom Adds" : groupOf(j.category),
          state: get(j.id),
          roles_tracked: roles,
          roleStates: roles.map((r) => ({ role: r, state: get(roleKey(j.id, r.id)) })),
        };
      }),
    [allJobs, get, rolesByJob],
  );

  const groups = useMemo(() => {
    const s = new Set(enriched.map((j) => j.group));
    return Array.from(s).sort();
  }, [enriched]);

  const countries = useMemo(() => {
    const s = new Set(enriched.map((j) => j.country ?? "Canada"));
    return Array.from(s).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return enriched.filter((j) => {
      if (statusFilter !== "all" && j.state.status !== statusFilter) return false;
      if (groupFilter !== "all" && j.group !== groupFilter) return false;
      if (countryFilter !== "all" && (j.country ?? "Canada") !== countryFilter) return false;
      if (resumeFilter === "ready" && !j.state.resumeReady) return false;
      if (resumeFilter === "missing" && j.state.resumeReady) return false;
      if (!q) return true;
      return (
        j.company.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q) ||
        j.roles.toLowerCase().includes(q) ||
        j.roles_tracked.some((r) => r.title.toLowerCase().includes(q)) ||
        (j.country ?? "").toLowerCase().includes(q) ||
        j.notes.toLowerCase().includes(q)
      );
    });
  }, [enriched, query, statusFilter, groupFilter, countryFilter, resumeFilter]);

  const stats = useMemo(() => {
    const counts: Record<AppStatus, number> = {
      "not-started": 0, researching: 0, applied: 0, interview: 0, offer: 0, rejected: 0,
    };
    for (const j of enriched) {
      counts[j.state.status]++;
    }
    return { total: enriched.length, counts };
  }, [enriched]);

  const exportCsv = () => {
    const headers = [
      "Company", "Role", "Country", "Category", "Status", "Applied Date",
      "Opening Date", "Closing Date", "Resume Ready", "Resume File", "Job Link", "Notes",
    ];
    const rows: string[][] = [];
    for (const j of enriched) {
      const exportRoles = j.roleStates.length > 0
        ? j.roleStates
        : [{ role: { id: j.id, title: j.roles, link: j.link }, state: j.state }];
      for (const { role, state } of exportRoles) {
        rows.push([
          j.company, role.title, j.country ?? "", j.category, STATUS_META[state.status].label,
          state.appliedOn ?? "", state.opensOn ?? "", state.closesOn ?? "",
          state.resumeReady ? "Yes" : "No", state.resumeFile?.name ?? "",
          role.link ?? j.link, state.notes ?? j.notes,
        ]);
      }
    }
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-xl sticky top-0 z-40 bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl gradient-hero glow flex items-center justify-center animate-float">
              <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Job Hunt <span className="text-gradient">HQ</span> ✨
              </h1>
               <p className="text-xs text-muted-foreground">Companies, roles, dates, notes, and resumes</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
             <Button onClick={() => setTimelineOpen(true)} variant="secondary">
              <Clock className="h-4 w-4 mr-2" /> Timeline
            </Button>
             <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add job
            </Button>
             <Button onClick={exportCsv} variant="secondary">
              <Download className="h-4 w-4 mr-2" />
               Export spreadsheet
            </Button>
          </div>
        </div>
      </header>

       <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Filters */}
        <section className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, role, country, notes…"
              className="pl-9 h-11 rounded-xl bg-card/60 border-border/60"
            />
          </div>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="h-11 bg-card/60 border-border/60 w-[180px]">
               <SelectValue placeholder="Status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All statuses ({stats.total})</SelectItem>
               {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label} ({stats.counts[s]})</SelectItem>)}
             </SelectContent>
           </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="h-11 rounded-xl bg-card/60 border-border/60 w-[170px]">
              <Globe className="h-4 w-4 mr-1 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌍 All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-11 rounded-xl bg-card/60 border-border/60 w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resumeFilter} onValueChange={setResumeFilter}>
            <SelectTrigger className="h-11 rounded-xl bg-card/60 border-border/60 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any resume</SelectItem>
              <SelectItem value="ready">✅ Resume ready</SelectItem>
              <SelectItem value="missing">📝 Needs resume</SelectItem>
            </SelectContent>
          </Select>
        </section>

         <section>
           <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
             <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> Companies A to Z</h2>
             <span className="text-sm text-muted-foreground">{filtered.length} shown</span>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[...filtered]
                .sort((a, b) => a.company.localeCompare(b.company))
                .map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    state={j.state}
                    onChange={(patch) => update(j.id, patch)}
                    onDelete={j.id.startsWith("custom-") ? () => removeCustomJob(j.id) : undefined}
                    get={get}
                    update={update}
                    roles={rolesOf(j.id)}
                    addRole={addRole}
                    removeRole={removeRole}
                  />
                ))}
           </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              No matches. Adjust your filters or add a new job. 💌
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
           Your information stays in this browser. Export a spreadsheet backup anytime.
        </footer>
      </main>

      <AddJobDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addCustomJob} />
      <TimelineDialog open={timelineOpen} onOpenChange={setTimelineOpen} jobs={enriched} />
    </div>
  );
}

type EnrichedJob = Job & {
  group: string;
  state: JobState;
  roles_tracked: Role[];
  roleStates: { role: Role; state: JobState }[];
};

function JobCard({
  job,
  state,
  onChange,
  onDelete,
  get,
  update,
  roles,
  addRole,
  removeRole,
}: {
  job: EnrichedJob;
  state: JobState;
  onChange: (patch: Partial<JobState>) => void;
  onDelete?: () => void;
  get: (id: string) => JobState;
  update: (id: string, patch: Partial<JobState>) => void;
  roles: Role[];
  addRole: (jobId: string, role: { title: string; link?: string; location?: string }) => string;
  removeRole: (jobId: string, roleId: string) => void;
}) {
  const meta = STATUS_META[state.status];
  const initials = job.company.slice(0, 2).toUpperCase();
  const suggested = job.roles.split(/,|\//).map((s) => s.trim()).filter(Boolean);

  return (
    <Dialog>
      <div
        className="group rounded-lg bg-card border border-border p-4 relative overflow-hidden transition-colors hover:border-primary/60"
        style={{ boxShadow: state.status === "offer" ? `0 10px 40px -10px ${meta.color}` : undefined }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: meta.color, opacity: state.status === "not-started" ? 0.3 : 1 }}
        />
        <div className="flex items-start gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
            style={{ background: `color-mix(in oklab, ${meta.color} 45%, transparent)`, color: "var(--foreground)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold truncate">{job.company}</h4>
              <a
                href={job.link}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-primary shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {job.category}{job.country ? ` · ${job.country}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="text-xs rounded-full border-0"
            style={{ background: `color-mix(in oklab, ${meta.color} 40%, transparent)`, color: "var(--foreground)" }}
          >
            {meta.emoji} {meta.label}
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs rounded-full border-0"
            style={{
              background: state.resumeReady
                ? "color-mix(in oklab, var(--success) 40%, transparent)"
                : "color-mix(in oklab, var(--warning) 40%, transparent)",
              color: "var(--foreground)",
            }}
          >
            {state.resumeReady ? (
              <>
                <FileCheck2 className="h-3 w-3 mr-1" /> {state.resumeFile ? state.resumeFile.name.slice(0, 14) : "Resume"}
              </>
            ) : (
              <>
                <FileX2 className="h-3 w-3 mr-1" /> No resume
              </>
            )}
          </Badge>
        </div>

        {roles.length > 0 ? (
          <div className="mt-3 space-y-1">
            {roles.slice(0, 3).map((r) => {
              const rs = get(roleKey(job.id, r.id));
              return (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_META[rs.status].color }} />
                  <span className="truncate flex-1">{r.title}</span>
                  <span className="text-muted-foreground shrink-0">{rs.resumeReady ? "📎" : "📝"}</span>
                </div>
              );
            })}
            {roles.length > 3 && (
              <p className="text-xs text-muted-foreground">+{roles.length - 3} more roles</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{job.notes}</p>
        )}

        {(state.opensOn || state.closesOn) && (
          <div className="mt-3 text-xs flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {state.opensOn && <span>Opens {state.opensOn}</span>}
            {state.opensOn && state.closesOn && <span>·</span>}
            {state.closesOn && <span>Closes {state.closesOn}</span>}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary" className="rounded-lg text-xs">
              <Briefcase className="h-3.5 w-3.5 mr-1" /> Roles {roles.length > 0 ? `(${roles.length})` : ""}
            </Button>
          </DialogTrigger>
          <Button
            size="sm"
            variant={state.resumeReady ? "default" : "outline"}
            className="rounded-lg text-xs"
            onClick={() => onChange({ resumeReady: !state.resumeReady })}
          >
            {state.resumeReady ? "✓ Ready" : "Mark ready"}
          </Button>
        </div>
      </div>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {job.company}
            {onDelete && (
              <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {job.category} · {job.roles}{job.country ? ` · 📍 ${job.country}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RolesSection
            jobId={job.id}
            suggested={suggested}
            roles={roles}
            get={get}
            update={update}
            addRole={addRole}
            removeRole={removeRole}
          />

          <div className="border-t border-border/60 pt-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Company-level status
            </label>
            <div className="mt-2">
              <StatusButtons value={state.status} onChange={(s) => onChange({ status: s })} />
            </div>
          </div>

          <ResumeUploader state={state} onChange={onChange} idSuffix={job.id} />

          <div className="grid grid-cols-2 gap-3">
            <DateField label="Opens" value={state.opensOn} onChange={(v) => onChange({ opensOn: v })} />
            <DateField label="Closes" value={state.closesOn} onChange={(v) => onChange({ closesOn: v })} />
          </div>
          <DateField label="Applied on" value={state.appliedOn} onChange={(v) => onChange({ appliedOn: v })} />

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your notes</label>
            <Textarea
              value={state.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Referrals, recruiter contacts, interview prep…"
              rows={3}
              className="mt-1"
            />
          </div>

          {state.timeline && state.timeline.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your journey</label>
              <ol className="mt-2 space-y-2 relative border-l-2 border-border/60 pl-4">
                {state.timeline.map((t, i) => (
                  <li key={i} className="text-xs relative">
                    <span
                      className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background"
                      style={{ background: STATUS_META[t.status].color }}
                    />
                    <span className="font-semibold">{STATUS_META[t.status].emoji} {STATUS_META[t.status].label}</span>
                    <span className="text-muted-foreground ml-2">{t.date}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Recon:</strong> {job.notes}
          </div>

          <a
            href={job.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Open careers page <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddJobDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (job: Omit<Job, "id">) => string;
}) {
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [roles, setRoles] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!company.trim()) return;
    onAdd({
      company: company.trim(),
      category: category.trim() || "Custom",
      country: country.trim() || "Other",
      roles: roles.trim() || "—",
      link: link.trim() || "#",
      notes: notes.trim(),
    });
    setCompany(""); setCategory(""); setCountry(""); setRoles(""); setLink(""); setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add a new dream job 🌷</DialogTitle>
          <DialogDescription>Track a company from anywhere in the world.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <LabeledInput label="Company *" value={company} onChange={setCompany} placeholder="Stripe" />
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Country" value={country} onChange={setCountry} placeholder="USA, UK, Germany…" />
            <LabeledInput label="Category" value={category} onChange={setCategory} placeholder="Fintech, AI, Startup…" />
          </div>
          <LabeledInput label="Target roles" value={roles} onChange={setRoles} placeholder="SWE, PM, Data Scientist" />
          <LabeledInput label="Careers link" value={link} onChange={setLink} placeholder="https://…" />
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>
            <Plus className="h-4 w-4 mr-1" /> Add job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function TimelineDialog({
  open,
  onOpenChange,
  jobs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobs: EnrichedJob[];
}) {
  const events = useMemo(() => {
    const list: { date: string; company: string; role?: string; status: AppStatus }[] = [];
    for (const j of jobs) {
      for (const t of j.state.timeline ?? []) {
        list.push({ date: t.date, company: j.company, status: t.status });
      }
      for (const rs of j.roleStates) {
        for (const t of rs.state.timeline ?? []) {
          list.push({ date: t.date, company: j.company, role: rs.role.title, status: t.status });
        }
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [jobs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Your application journey 🌸</DialogTitle>
          <DialogDescription>Every status change, logged automatically.</DialogDescription>
        </DialogHeader>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No events yet. Update a job status to start your timeline. 💌
          </p>
        ) : (
          <ol className="relative border-l-2 border-border/60 pl-5 space-y-4">
            {events.map((e, i) => (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[27px] top-1 h-4 w-4 rounded-full border-2 border-background"
                  style={{ background: STATUS_META[e.status].color }}
                />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm">
                    {STATUS_META[e.status].emoji} {e.company}
                  </span>
                  <span className="text-xs text-muted-foreground">{e.date}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {e.role ? `${e.role} · ` : ""}{STATUS_META[e.status].label}
                </p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
