import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { JOBS, STATUS_META, groupOf, type AppStatus } from "@/data/jobs";
import { useJobTracker, type JobState } from "@/hooks/use-job-tracker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Search,
  Download,
  Flame,
  Sparkles,
  FileCheck2,
  FileX2,
  Target,
  Trophy,
  Rocket,
  CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Job Hunt HQ — Track Applications & Resumes" },
      {
        name: "description",
        content:
          "A dopamine-charged dashboard to track job openings, closings, resume readiness, and application progress across 120+ target companies.",
      },
      { property: "og:title", content: "Job Hunt HQ — Track Applications & Resumes" },
      { property: "og:description", content: "A dopamine-charged dashboard to track job openings, closings, resume readiness, and application progress across 120+ target companies." },
    ],
  }),
});

const STATUSES: AppStatus[] = ["not-started", "researching", "applied", "interview", "offer", "rejected"];

function Dashboard() {
  const { get, update, map, hydrated } = useJobTracker();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [resumeFilter, setResumeFilter] = useState<string>("all");

  const enriched = useMemo(
    () =>
      JOBS.map((j) => ({
        ...j,
        group: groupOf(j.category),
        state: get(j.id),
      })),
    [get],
  );

  const groups = useMemo(() => {
    const s = new Set(enriched.map((j) => j.group));
    return Array.from(s).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return enriched.filter((j) => {
      if (statusFilter !== "all" && j.state.status !== statusFilter) return false;
      if (groupFilter !== "all" && j.group !== groupFilter) return false;
      if (resumeFilter === "ready" && !j.state.resumeReady) return false;
      if (resumeFilter === "missing" && j.state.resumeReady) return false;
      if (!q) return true;
      return (
        j.company.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q) ||
        j.roles.toLowerCase().includes(q) ||
        j.notes.toLowerCase().includes(q)
      );
    });
  }, [enriched, query, statusFilter, groupFilter, resumeFilter]);

  const stats = useMemo(() => {
    const total = JOBS.length;
    const counts: Record<AppStatus, number> = {
      "not-started": 0, researching: 0, applied: 0, interview: 0, offer: 0, rejected: 0,
    };
    let resumeReady = 0;
    let openWindow = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const j of enriched) {
      counts[j.state.status]++;
      if (j.state.resumeReady) resumeReady++;
      const opens = j.state.opensOn;
      const closes = j.state.closesOn;
      if ((!opens || opens <= today) && (!closes || closes >= today) && (opens || closes)) openWindow++;
    }
    const activeApps = counts.applied + counts.interview + counts.offer;
    const progressPct = Math.round(((total - counts["not-started"]) / total) * 100);
    return { total, counts, resumeReady, openWindow, activeApps, progressPct };
  }, [enriched]);

  const exportCsv = () => {
    const headers = [
      "Company", "Category", "Group", "Target Roles", "Link",
      "Status", "Resume Ready", "Opens On", "Closes On", "Applied On", "Notes", "Personal Notes",
    ];
    const rows = enriched.map((j) => [
      j.company, j.category, j.group, j.roles, j.link,
      STATUS_META[j.state.status].label,
      j.state.resumeReady ? "Yes" : "No",
      j.state.opensOn ?? "", j.state.closesOn ?? "", j.state.appliedOn ?? "",
      j.notes, j.state.notes ?? "",
    ]);
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
            <div className="h-11 w-11 rounded-2xl gradient-hero glow flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Job Hunt <span className="text-gradient">HQ</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                {stats.total} targets · {stats.activeApps} in play · {stats.resumeReady} resumes ready
              </p>
            </div>
          </div>
          <Button onClick={exportCsv} variant="secondary" className="rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Progress */}
        <section className="rounded-3xl gradient-hero p-[1px] glow">
          <div className="rounded-3xl bg-card/90 backdrop-blur p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Your grind, visualized
                </p>
                <h2 className="text-3xl sm:text-5xl font-black mt-1">
                  {stats.progressPct}% <span className="text-muted-foreground text-2xl sm:text-3xl font-bold">momentum</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.total - stats.counts["not-started"]} of {stats.total} companies touched. Keep it moving. 🔥
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {stats.counts.offer > 0 && (
                  <Badge className="gradient-success text-white border-0 text-sm px-3 py-1.5 rounded-full">
                    <Trophy className="h-3.5 w-3.5 mr-1" /> {stats.counts.offer} offer{stats.counts.offer > 1 ? "s" : ""}
                  </Badge>
                )}
                {stats.counts.interview > 0 && (
                  <Badge style={{ background: STATUS_META.interview.color }} className="text-white border-0 text-sm px-3 py-1.5 rounded-full">
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
          <StatCard label="Applied" value={stats.counts.applied} icon={<Rocket className="h-5 w-5" />} tint="var(--info)" />
          <StatCard label="Interviews" value={stats.counts.interview} icon={<Flame className="h-5 w-5" />} tint="var(--primary)" />
          <StatCard label="Resumes Ready" value={`${stats.resumeReady}/${stats.total}`} icon={<FileCheck2 className="h-5 w-5" />} tint="var(--success)" />
          <StatCard label="Open Windows" value={stats.openWindow} icon={<CalendarDays className="h-5 w-5" />} tint="var(--pink)" />
        </section>

        {/* Status pill row */}
        <section className="flex flex-wrap gap-2">
          <StatusPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`All · ${stats.total}`} color="hsl(220 15% 45%)" />
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
              placeholder="Search company, role, category, notes…"
              className="pl-9 h-11 rounded-xl bg-card/60 border-border/60"
            />
          </div>
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
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No matches. Adjust your filters and get back in the game.
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
          Data lives in your browser (localStorage). Export CSV to open in Excel or Google Sheets. 🎯
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, tint }: { label: string; value: React.ReactNode; icon: React.ReactNode; tint: string }) {
  return (
    <div className="rounded-2xl gradient-card border border-border/60 p-4 card-shadow relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: tint }} />
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklab, ${tint} 20%, transparent)`, color: tint }}>
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
        color: active ? "white" : "var(--foreground)",
        boxShadow: active ? `0 6px 20px -8px ${color}` : "none",
      }}
    >
      {label}
    </button>
  );
}

function JobCard({
  job,
  state,
  onChange,
}: {
  job: { id: string; company: string; category: string; roles: string; link: string; notes: string };
  state: JobState;
  onChange: (patch: Partial<JobState>) => void;
}) {
  const meta = STATUS_META[state.status];
  const initials = job.company.slice(0, 2).toUpperCase();

  return (
    <Dialog>
      <div
        className="group rounded-2xl gradient-card border border-border/60 card-shadow p-4 relative overflow-hidden transition-all hover:border-primary/50 hover:-translate-y-0.5"
        style={{ boxShadow: state.status === "offer" ? `0 10px 40px -10px ${meta.color}` : undefined }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: meta.color, opacity: state.status === "not-started" ? 0.2 : 1 }}
        />
        <div className="flex items-start gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
            style={{ background: `color-mix(in oklab, ${meta.color} 25%, transparent)`, color: meta.color }}
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
            <p className="text-xs text-muted-foreground truncate">{job.category}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="text-xs rounded-full border-0"
            style={{ background: `color-mix(in oklab, ${meta.color} 20%, transparent)`, color: meta.color }}
          >
            {meta.emoji} {meta.label}
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs rounded-full border-0"
            style={{
              background: state.resumeReady
                ? "color-mix(in oklab, var(--success) 20%, transparent)"
                : "color-mix(in oklab, var(--warning) 20%, transparent)",
              color: state.resumeReady ? "var(--success)" : "var(--warning)",
            }}
          >
            {state.resumeReady ? (
              <>
                <FileCheck2 className="h-3 w-3 mr-1" /> Resume
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
              Track
            </Button>
          </DialogTrigger>
          <Button
            size="sm"
            variant={state.resumeReady ? "default" : "outline"}
            className="rounded-lg text-xs"
            onClick={() => onChange({ resumeReady: !state.resumeReady })}
          >
            {state.resumeReady ? "✓ Resume" : "Mark resume"}
          </Button>
        </div>
      </div>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">{job.company}</DialogTitle>
          <DialogDescription>
            {job.category} · {job.roles}
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
                    color: state.status === s ? "white" : "var(--foreground)",
                  }}
                >
                  {STATUS_META[s].emoji} {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border p-3">
            <Checkbox
              id={`resume-${job.id}`}
              checked={state.resumeReady}
              onCheckedChange={(v) => onChange({ resumeReady: !!v })}
            />
            <label htmlFor={`resume-${job.id}`} className="text-sm font-medium cursor-pointer">
              Resume tailored & ready for this role
            </label>
          </div>

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

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
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

function DateField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
