import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { JOBS, STATUS_META, groupOf, type AppStatus, type Job } from "@/data/jobs";
import { useJobTracker, roleKey, type JobState, type Role } from "@/hooks/use-job-tracker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Sparkles,
  FileCheck2,
  FileX2,
  Target,
  Trophy,
  Heart,
  CalendarDays,
  Plus,
  Trash2,
  Globe,
  Clock,
  Building2,
  LayoutGrid,
  Briefcase,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Job Hunt HQ — Pastel Application Tracker 💕" },
      {
        name: "description",
        content:
          "A cute pastel dashboard to track job openings, resumes, and application timeline across your dream companies worldwide.",
      },
      { property: "og:title", content: "Job Hunt HQ — Pastel Application Tracker" },
      { property: "og:description", content: "Track applications, upload resumes, and log a timeline across your target companies." },
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
  const [view, setView] = useState<"category" | "company">("category");

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
    const total = enriched.length;
    const counts: Record<AppStatus, number> = {
      "not-started": 0, researching: 0, applied: 0, interview: 0, offer: 0, rejected: 0,
    };
    let resumeReady = 0;
    let openWindow = 0;
    let rolesTracked = 0;
    let rolesApplied = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const j of enriched) {
      counts[j.state.status]++;
      if (j.state.resumeReady) resumeReady++;
      const opens = j.state.opensOn;
      const closes = j.state.closesOn;
      if ((!opens || opens <= today) && (!closes || closes >= today) && (opens || closes)) openWindow++;
      for (const rs of j.roleStates) {
        rolesTracked++;
        if (rs.state.status === "applied" || rs.state.status === "interview" || rs.state.status === "offer")
          rolesApplied++;
      }
    }
    const activeApps = counts.applied + counts.interview + counts.offer;
    const progressPct = total ? Math.round(((total - counts["not-started"]) / total) * 100) : 0;
    return { total, counts, resumeReady, openWindow, activeApps, progressPct, rolesTracked, rolesApplied };
  }, [enriched]);

  const exportCsv = () => {
    const headers = [
      "Company", "Category", "Country", "Group", "Role", "Link",
      "Status", "Resume Ready", "Resume File", "Opens On", "Closes On", "Applied On", "Notes", "Personal Notes",
    ];
    const rows: string[][] = [];
    for (const j of enriched) {
      rows.push([
        j.company, j.category, j.country ?? "", j.group, `Company target: ${j.roles}`, j.link,
        STATUS_META[j.state.status].label,
        j.state.resumeReady ? "Yes" : "No",
        j.state.resumeFile?.name ?? "",
        j.state.opensOn ?? "", j.state.closesOn ?? "", j.state.appliedOn ?? "",
        j.notes, j.state.notes ?? "",
      ]);
      for (const { role, state } of j.roleStates) {
        rows.push([
          j.company, j.category, j.country ?? "", j.group, role.title, role.link ?? j.link,
          STATUS_META[state.status].label,
          state.resumeReady ? "Yes" : "No",
          state.resumeFile?.name ?? "",
          state.opensOn ?? "", state.closesOn ?? "", state.appliedOn ?? "",
          "", state.notes ?? "",
        ]);
      }
    }
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-hunt-${new Date().toISOString().slice(0, 10)}.csv`;
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
              <p className="text-xs text-muted-foreground">
                {stats.total} targets · {stats.activeApps} in play · {stats.resumeReady} resumes ready
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setTimelineOpen(true)} variant="secondary" className="rounded-full">
              <Clock className="h-4 w-4 mr-2" /> Timeline
            </Button>
            <Button onClick={() => setAddOpen(true)} className="rounded-full gradient-hero text-primary-foreground border-0">
              <Plus className="h-4 w-4 mr-2" /> Add job
            </Button>
            <Button onClick={exportCsv} variant="secondary" className="rounded-full">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Progress */}
        <section className="rounded-3xl gradient-hero p-[1px] glow">
          <div className="rounded-3xl bg-card/90 backdrop-blur p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Your grind, glowed up 💗
                </p>
                <h2 className="text-3xl sm:text-5xl font-black mt-1">
                  {stats.progressPct}% <span className="text-muted-foreground text-2xl sm:text-3xl font-bold">momentum</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.total - stats.counts["not-started"]} of {stats.total} companies touched. You're doing amazing sweetie 🌸
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {stats.counts.offer > 0 && (
                  <Badge className="gradient-success border-0 text-sm px-3 py-1.5 rounded-full text-foreground">
                    <Trophy className="h-3.5 w-3.5 mr-1" /> {stats.counts.offer} offer{stats.counts.offer > 1 ? "s" : ""}
                  </Badge>
                )}
                {stats.counts.interview > 0 && (
                  <Badge style={{ background: STATUS_META.interview.color }} className="border-0 text-sm px-3 py-1.5 rounded-full text-foreground">
                    💬 {stats.counts.interview} interview{stats.counts.interview > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={stats.progressPct} className="mt-6 h-3" />
          </div>
        </section>

        {/* Stat Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Applied" value={stats.counts.applied} icon={<Sparkles className="h-5 w-5" />} tint="var(--info)" />
          <StatCard label="Interviews" value={stats.counts.interview} icon={<Heart className="h-5 w-5" />} tint="var(--lilac)" />
          <StatCard label="Resumes Ready" value={`${stats.resumeReady}/${stats.total}`} icon={<FileCheck2 className="h-5 w-5" />} tint="var(--success)" />
          <StatCard label="Open Windows" value={stats.openWindow} icon={<CalendarDays className="h-5 w-5" />} tint="var(--pink)" />
        </section>

        {/* Status pill row */}
        <section className="flex flex-wrap gap-2">
          <StatusPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`All · ${stats.total}`} color="oklch(0.78 0.05 320)" />
          {STATUSES.map((s) => (
            <StatusPill
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={`${STATUS_META[s].emoji} ${STATUS_META[s].label} · ${stats.counts[s]}`}
              color={STATUS_META[s].color}
            />
          ))}
        </section>

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

        {/* Groups */}
        <section className="space-y-8">
          {groups
            .filter((g) => groupFilter === "all" || g === groupFilter)
            .map((g) => {
              const items = filtered.filter((j) => j.group === g);
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-lg sm:text-xl font-bold">{g}</h3>
                    <span className="text-xs text-muted-foreground">{items.length} companies</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {items.map((j) => (
                      <JobCard
                        key={j.id}
                        job={j}
                        state={j.state}
                        onChange={(patch) => update(j.id, patch)}
                        onDelete={j.id.startsWith("custom-") ? () => removeCustomJob(j.id) : undefined}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No matches. Adjust your filters or add a new job. 💌
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
          Data lives in your browser (localStorage). Export CSV to open in Excel or Google Sheets. 🌸
        </footer>
      </main>

      <AddJobDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addCustomJob} />
      <TimelineDialog open={timelineOpen} onOpenChange={setTimelineOpen} jobs={enriched} />
    </div>
  );
}

function StatCard({ label, value, icon, tint }: { label: string; value: React.ReactNode; icon: React.ReactNode; tint: string }) {
  return (
    <div className="rounded-2xl gradient-card border border-border/60 p-4 card-shadow relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl" style={{ background: tint }} />
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklab, ${tint} 35%, transparent)`, color: "var(--foreground)" }}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black mt-2">{value}</div>
    </div>
  );
}

function StatusPill({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className="text-sm px-4 py-2 rounded-full border transition-all font-medium hover:scale-105"
      style={{
        background: active ? color : "transparent",
        borderColor: active ? color : "var(--border)",
        color: "var(--foreground)",
        boxShadow: active ? `0 6px 20px -8px ${color}` : "none",
      }}
    >
      {label}
    </button>
  );
}

type EnrichedJob = Job & { group: string; state: JobState };

function JobCard({
  job,
  state,
  onChange,
  onDelete,
}: {
  job: EnrichedJob;
  state: JobState;
  onChange: (patch: Partial<JobState>) => void;
  onDelete?: () => void;
}) {
  const meta = STATUS_META[state.status];
  const initials = job.company.slice(0, 2).toUpperCase();

  return (
    <Dialog>
      <div
        className="group rounded-2xl gradient-card border border-border/60 card-shadow p-4 relative overflow-hidden transition-all hover:border-primary/60 hover:-translate-y-0.5"
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

        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{job.notes}</p>

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
              Track & upload
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
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ status: s })}
                  className="text-xs px-2 py-2 rounded-lg border font-medium transition-all hover:scale-105"
                  style={{
                    background: state.status === s ? STATUS_META[s].color : "transparent",
                    borderColor: state.status === s ? STATUS_META[s].color : "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {STATUS_META[s].emoji} {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          <ResumeUploader state={state} onChange={onChange} />

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

function ResumeUploader({ state, onChange }: { state: JobState; onChange: (patch: Partial<JobState>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Please pick a file under 5MB 💗");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const rf: ResumeFile = { name: file.name, dataUrl, size: file.size };
      onChange({ resumeFile: rf, resumeReady: true });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-xl border border-border/60 p-3 bg-muted/40">
      <div className="flex items-center gap-2 mb-2">
        <Checkbox
          id="resume-ready"
          checked={state.resumeReady}
          onCheckedChange={(v) => onChange({ resumeReady: !!v })}
        />
        <label htmlFor="resume-ready" className="text-sm font-medium cursor-pointer">
          Resume tailored & ready 💕
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {state.resumeFile ? (
        <div className="flex items-center gap-2 text-xs">
          <a
            href={state.resumeFile.dataUrl}
            download={state.resumeFile.name}
            className="flex-1 truncate font-semibold text-primary hover:underline"
          >
            📎 {state.resumeFile.name}
          </a>
          <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onChange({ resumeFile: undefined })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-lg"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-2" /> Upload resume (PDF/DOC)
        </Button>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
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
          <Button onClick={submit} className="gradient-hero text-primary-foreground border-0">
            <Plus className="h-4 w-4 mr-1" /> Add job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
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
    const list: { date: string; company: string; status: AppStatus }[] = [];
    for (const j of jobs) {
      for (const t of j.state.timeline ?? []) {
        list.push({ date: t.date, company: j.company, status: t.status });
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
                <p className="text-xs text-muted-foreground">{STATUS_META[e.status].label}</p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
