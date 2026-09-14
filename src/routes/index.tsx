import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { JOBS, STATUS_META, type AppStatus, type Job } from "@/data/jobs";
import { useJobTracker, roleKey, type JobState, type Role } from "@/hooks/use-job-tracker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DateField, LabeledInput, ResumeUploader, StatusButtons } from "@/components/track-fields";
import { RolesSection } from "@/components/roles-section";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, CalendarDays, Clock3, Download, ExternalLink, FileText, Plus, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Job Hunt HQ | Application Tracker" },
      { name: "description", content: "Track companies, roles, deadlines, notes, and tailored resumes in one organized workspace." },
      { property: "og:title", content: "Job Hunt HQ | Application Tracker" },
      { property: "og:description", content: "A practical workspace for job applications, roles, resumes, and deadlines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type EnrichedJob = Job & {
  state: JobState;
  roles_tracked: Role[];
  roleStates: { role: Role; state: JobState }[];
};

type WorkspaceView = "companies" | "dates";

function Dashboard() {
  const tracker = useJobTracker();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<WorkspaceView>("companies");
  const [addOpen, setAddOpen] = useState(false);

  const enriched = useMemo<EnrichedJob[]>(() => [...tracker.customJobs, ...JOBS].map((job) => {
    const roles = tracker.rolesByJob[job.id] ?? [];
    return {
      ...job,
      state: tracker.get(job.id),
      roles_tracked: roles,
      roleStates: roles.map((role) => ({ role, state: tracker.get(roleKey(job.id, role.id)) })),
    };
  }), [tracker.customJobs, tracker.rolesByJob, tracker.get]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return enriched.filter((job) => {
      const roleMatch = job.roleStates.some(({ role, state }) =>
        role.title.toLowerCase().includes(text) && (statusFilter === "all" || state.status === statusFilter));
      const companyStatusMatch = statusFilter === "all" || job.state.status === statusFilter || roleMatch;
      if (!companyStatusMatch) return false;
      if (!text) return true;
      return job.company.toLowerCase().includes(text) || job.category.toLowerCase().includes(text) ||
        (job.country ?? "").toLowerCase().includes(text) || job.roles.toLowerCase().includes(text) || roleMatch;
    }).sort((a, b) => a.company.localeCompare(b.company));
  }, [enriched, query, statusFilter]);

  const selected = enriched.find((job) => job.id === selectedId)
    ?? enriched.find((job) => job.company.toLowerCase().includes("rbc"))
    ?? filtered[0]
    ?? enriched[0];

  const dateRows = useMemo(() => enriched.flatMap((job) => {
    const roleRows = job.roleStates.map(({ role, state }) => ({ job, role, state }));
    const companyRow = (job.state.opensOn || job.state.closesOn || job.state.appliedOn)
      ? [{ job, role: undefined, state: job.state }]
      : [];
    return [...roleRows, ...companyRow];
  }).filter(({ job, role, state }) => {
    const text = query.trim().toLowerCase();
    if (statusFilter !== "all" && state.status !== statusFilter) return false;
    if (!text) return true;
    return job.company.toLowerCase().includes(text) || role?.title.toLowerCase().includes(text);
  }).sort((a, b) => {
    const aDate = a.state.closesOn || a.state.opensOn || a.state.appliedOn || "9999-12-31";
    const bDate = b.state.closesOn || b.state.opensOn || b.state.appliedOn || "9999-12-31";
    return aDate.localeCompare(bDate);
  }), [enriched, query, statusFilter]);

  const exportCsv = () => {
    const headers = ["Company", "Role", "Country", "Category", "Status", "Applied Date", "Opening Date", "Closing Date", "Resume Ready", "Resume File", "Job Link", "Notes"];
    const rows = enriched.flatMap((job) => {
      const roleRows = job.roleStates.length > 0
        ? job.roleStates
        : [{ role: { id: job.id, title: job.roles, link: job.link }, state: job.state }];
      return roleRows.map(({ role, state }) => [
        job.company, role.title, job.country ?? "", job.category, STATUS_META[state.status].label,
        state.appliedOn ?? "", state.opensOn ?? "", state.closesOn ?? "", state.resumeReady ? "Yes" : "No",
        state.resumeFile?.name ?? "", role.link ?? job.link, state.notes ?? job.notes,
      ]);
    });
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `job-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!tracker.hydrated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-xl font-bold">Job Hunt HQ</h1>
            <p className="text-xs text-muted-foreground">Application workspace</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add company</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center gap-3 border-b">
          <Button variant="ghost" className={`rounded-none border-b-2 px-3 ${view === "companies" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => setView("companies")}>
            <Building2 className="mr-2 h-4 w-4" />Companies
          </Button>
          <Button variant="ghost" className={`rounded-none border-b-2 px-3 ${view === "dates" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => setView("dates")}>
            <CalendarDays className="mr-2 h-4 w-4" />Dates
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies or roles" className="h-10 rounded-md pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[180px] rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_META) as AppStatus[]).map((status) => <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {view === "companies" ? (
          <div className="grid min-h-[680px] overflow-hidden rounded-md border bg-card lg:grid-cols-[320px_1fr]">
            <aside className="border-b lg:border-b-0 lg:border-r">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">Companies</p>
                <p className="text-xs text-muted-foreground">{filtered.length} results</p>
              </div>
              <div className="max-h-[680px] overflow-y-auto">
                {filtered.map((job) => (
                  <Button key={job.id} variant="ghost" onClick={() => setSelectedId(job.id)} className={`h-auto w-full justify-start rounded-none border-b px-4 py-3 text-left ${selected?.id === job.id ? "bg-accent" : ""}`}>
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">{job.company.slice(0, 2).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{job.company}</span>
                        <span className="block truncate text-xs font-normal text-muted-foreground">{job.roles_tracked.length} tracked roles · {job.country ?? "Canada"}</span>
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </aside>
            {selected ? (
              <CompanyWorkspace
                job={selected}
                get={tracker.get}
                update={tracker.update}
                addRole={tracker.addRole}
                removeRole={tracker.removeRole}
                onDelete={selected.id.startsWith("custom-") ? () => tracker.removeCustomJob(selected.id) : undefined}
              />
            ) : <div className="p-8 text-sm text-muted-foreground">No company matches your search.</div>}
          </div>
        ) : <DatesWorkspace rows={dateRows} />}
      </main>
      <AddJobDialog open={addOpen} onOpenChange={setAddOpen} onAdd={tracker.addCustomJob} />
    </div>
  );
}

function CompanyWorkspace({ job, get, update, addRole, removeRole, onDelete }: {
  job: EnrichedJob;
  get: (id: string) => JobState;
  update: (id: string, patch: Partial<JobState>) => void;
  addRole: (jobId: string, role: { title: string; link?: string; location?: string }) => string;
  removeRole: (jobId: string, roleId: string) => void;
  onDelete?: () => void;
}) {
  const suggested = job.roles.split(/,|\//).map((role) => role.trim()).filter(Boolean);
  return (
    <section className="min-w-0 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{job.company}</h2>
            <a href={job.link} target="_blank" rel="noreferrer" aria-label={`Open ${job.company} careers page`} className="text-muted-foreground hover:text-primary"><ExternalLink className="h-4 w-4" /></a>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{job.category} · {job.country ?? "Canada"}</p>
        </div>
        {onDelete && <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete company"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
      </div>

      <div className="grid gap-6 py-6 xl:grid-cols-[1fr_280px]">
        <div>
          <RolesSection jobId={job.id} suggested={suggested} roles={job.roles_tracked} get={get} update={update} addRole={addRole} removeRole={removeRole} />
        </div>
        <aside className="space-y-5 border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Company status</p>
            <StatusButtons value={job.state.status} onChange={(status) => update(job.id, { status })} compact />
          </div>
          <ResumeUploader state={job.state} onChange={(patch) => update(job.id, patch)} idSuffix={job.id} />
          <div className="grid grid-cols-2 gap-2">
            <DateField label="Opens" value={job.state.opensOn} onChange={(opensOn) => update(job.id, { opensOn })} />
            <DateField label="Closes" value={job.state.closesOn} onChange={(closesOn) => update(job.id, { closesOn })} />
          </div>
          <DateField label="Applied" value={job.state.appliedOn} onChange={(appliedOn) => update(job.id, { appliedOn })} />
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Notes</label>
            <Textarea className="mt-1" rows={4} value={job.state.notes ?? ""} onChange={(event) => update(job.id, { notes: event.target.value })} placeholder="Recruiter, referral, interview notes" />
          </div>
        </aside>
      </div>
      {job.notes && <div className="border-t pt-4 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Company notes:</span> {job.notes}</div>}
    </section>
  );
}

function DatesWorkspace({ rows }: { rows: { job: EnrichedJob; role?: Role; state: JobState }[] }) {
  return (
    <section className="overflow-hidden rounded-md border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Application dates</h2>
        <p className="text-xs text-muted-foreground">Opening, closing, and submitted dates in one place</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Company</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Opens</th><th className="px-4 py-3">Closes</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Resume</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ job, role, state }, index) => (
              <tr key={`${job.id}-${role?.id ?? "company"}-${index}`}>
                <td className="px-4 py-3 font-semibold">{job.company}</td>
                <td className="px-4 py-3">{role?.title ?? "Company level"}</td>
                <td className="px-4 py-3 text-muted-foreground">{state.opensOn || "Not set"}</td>
                <td className="px-4 py-3 text-muted-foreground">{state.closesOn || "Not set"}</td>
                <td className="px-4 py-3 text-muted-foreground">{state.appliedOn || "Not set"}</td>
                <td className="px-4 py-3">{STATUS_META[state.status].label}</td>
                <td className="px-4 py-3">{state.resumeReady ? <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4" />Ready</span> : "Needed"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No roles or dates match your filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AddJobDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (value: boolean) => void; onAdd: (job: Omit<Job, "id">) => string }) {
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [roles, setRoles] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const submit = () => {
    if (!company.trim()) return;
    onAdd({ company: company.trim(), category: category.trim() || "Other", country: country.trim() || "Other", roles: roles.trim() || "Add a role", link: link.trim() || "#", notes: notes.trim() });
    setCompany(""); setCategory(""); setCountry(""); setRoles(""); setLink(""); setNotes(""); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add company</DialogTitle><DialogDescription>Create a company record, then add each role inside it.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <LabeledInput label="Company *" value={company} onChange={setCompany} placeholder="Company name" />
          <div className="grid grid-cols-2 gap-3"><LabeledInput label="Country" value={country} onChange={setCountry} /><LabeledInput label="Category" value={category} onChange={setCategory} /></div>
          <LabeledInput label="Suggested roles" value={roles} onChange={setRoles} placeholder="Analyst, Product Manager" />
          <LabeledInput label="Careers page" value={link} onChange={setLink} placeholder="https://" />
          <div><label className="text-xs font-semibold uppercase text-muted-foreground">Notes</label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-1" /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}><Plus className="mr-2 h-4 w-4" />Add company</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
