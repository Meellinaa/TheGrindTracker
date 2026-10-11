import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, FileText, MessageSquare, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Application, ApplicationStatus } from "@/hooks/use-job-tracker";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  screen: "Screen",
  interviewing: "Interviewing",
  interviewed: "Interviewed",
  "final-round": "Final round",
  offer: "Offer",
  rejected: "Rejected",
};

const FUNNEL: { key: ApplicationStatus; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "screen", label: "Screen" },
  { key: "interviewing", label: "Interview" },
  { key: "final-round", label: "Final round" },
  { key: "offer", label: "Offer" },
];

function reached(status: ApplicationStatus, stage: ApplicationStatus) {
  const order: ApplicationStatus[] = ["applied", "screen", "interviewing", "interviewed", "final-round", "offer"];
  if (status === "rejected") return stage === "applied";
  return order.indexOf(status) >= order.indexOf(stage);
}

export function ApplicationsSection({
  applications,
  weeklyGoal,
  onWeeklyGoalChange,
  onUpdate,
}: {
  applications: Application[];
  weeklyGoal: number;
  onWeeklyGoalChange: (goal: number) => void;
  onUpdate: (id: string, patch: Partial<Omit<Application, "id">>) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekKey = weekStart.toISOString().slice(0, 10);

  const metrics = useMemo(() => {
    const thisWeek = applications.filter((a) => a.dateApplied >= weekKey).length;
    const responses = applications.filter((a) => a.responseDate || a.status !== "applied");
    const responseRate = applications.length ? Math.round((responses.length / applications.length) * 100) : 0;
    const responseDays = responses.flatMap((a) => {
      if (!a.dateApplied || !a.responseDate) return [];
      return [Math.max(0, Math.round((new Date(a.responseDate).getTime() - new Date(a.dateApplied).getTime()) / 86400000))];
    });
    const averageDays = responseDays.length ? Math.round(responseDays.reduce((sum, days) => sum + days, 0) / responseDays.length) : null;
    const deadlines = applications.filter((a) => a.deadline && a.deadline >= todayKey && !["offer", "rejected"].includes(a.status)).sort((a, b) => a.deadline.localeCompare(b.deadline));
    const followUps = applications.filter((a) => {
      if (!a.dateApplied || a.responseDate || a.status !== "applied") return false;
      const lastContact = a.lastFollowUpDate || a.dateApplied;
      return (today.getTime() - new Date(lastContact).getTime()) / 86400000 >= 14;
    });
    return { thisWeek, responseRate, averageDays, deadlines, followUps };
  }, [applications, todayKey, weekKey]);

  const resumeResults = useMemo(() => {
    const map = new Map<string, { sent: number; replies: number }>();
    for (const application of applications) {
      if (!application.resumeFileName) continue;
      const current = map.get(application.resumeFileName) ?? { sent: 0, replies: 0 };
      current.sent++;
      if (application.responseDate || application.status !== "applied") current.replies++;
      map.set(application.resumeFileName, current);
    }
    return Array.from(map.entries());
  }, [applications]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/60 bg-card/70 card-shadow p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-bold">This week</p>
            <p className="text-3xl font-black text-gradient">{metrics.thisWeek} of {weeklyGoal}</p>
            <p className="text-xs text-muted-foreground">real applications sent toward your weekly goal</p>
          </div>
          <label className="text-xs font-semibold text-muted-foreground">
            Weekly goal
            <Input className="mt-1 w-24" type="number" min={1} value={weeklyGoal} onChange={(e) => onWeeklyGoalChange(Number(e.target.value))} />
          </label>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full gradient-hero transition-all" style={{ width: `${Math.min(100, Math.round((metrics.thisWeek / weeklyGoal) * 100))}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FUNNEL.map(({ key, label }) => {
            const count = applications.filter((a) => reached(a.status, key)).length;
            const rate = applications.length ? Math.round((count / applications.length) * 100) : 0;
            return <div key={key} className="rounded-lg bg-muted/55 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-black text-xl">{count}</p><p className="text-xs">{rate}%</p></div>;
          })}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 p-3"><p className="text-xs text-muted-foreground">Response rate</p><p className="text-2xl font-black">{metrics.responseRate}%</p></div>
          <div className="rounded-lg border border-border/60 p-3"><p className="text-xs text-muted-foreground">Average time to hear back</p><p className="text-2xl font-black">{metrics.averageDays == null ? "Not enough data" : `${metrics.averageDays} days`}</p></div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-lg border border-border bg-card p-4"><h3 className="font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Open deadlines</h3>{metrics.deadlines.length ? <div className="mt-3 space-y-2">{metrics.deadlines.map((a) => <div key={a.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{a.company} · {a.role}</span><span className="text-muted-foreground shrink-0">{a.deadline}</span></div>)}</div> : <p className="text-sm text-muted-foreground mt-3">No open deadlines added yet.</p>}</section>
        <section className="rounded-lg border border-border bg-card p-4"><h3 className="font-bold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Needs follow-up</h3>{metrics.followUps.length ? <div className="mt-3 space-y-2">{metrics.followUps.map((a) => <div key={a.id} className="text-sm">{a.company} · {a.role}</div>)}</div> : <p className="text-sm text-muted-foreground mt-3">You are caught up. Nothing is overdue.</p>}</section>
      </div>

      <section>
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4"><h2 className="text-lg font-bold">Applications</h2><span className="text-sm text-muted-foreground">{applications.length} roles</span></div>
        <div className="space-y-3">
          {applications.map((application) => {
            const open = openId === application.id;
            return <div key={application.id} className="rounded-lg bg-card border border-border overflow-hidden">
              <div className="p-4 flex items-start gap-3"><div className="min-w-0 flex-1"><h3 className="font-bold">{application.company}</h3><p className="text-sm text-muted-foreground">{application.role || "Role not added"} · {STATUS_LABELS[application.status]}</p></div><Button size="icon" variant="ghost" onClick={() => setOpenId(open ? null : application.id)} aria-label={open ? "Close application" : "Edit application"}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></div>
              {open && <ApplicationEditor application={application} onUpdate={(patch) => onUpdate(application.id, patch)} />}
            </div>;
          })}
          {applications.length === 0 && <p className="text-center py-12 text-muted-foreground">No applications yet. Convert a company from your watchlist when you apply. 💌</p>}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4"><h3 className="font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Resume reply comparison</h3>{resumeResults.length ? <div className="mt-3 space-y-2">{resumeResults.map(([name, result]) => <div key={name} className="grid grid-cols-[1fr_auto] gap-3 text-sm"><span className="truncate">{name}</span><span>{result.replies} replies / {result.sent} sent · {Math.round((result.replies / result.sent) * 100)}%</span></div>)}</div> : <p className="text-sm text-muted-foreground mt-3">Resume results will appear after applications have resume file names.</p>}</section>
    </div>
  );
}

function ApplicationEditor({ application, onUpdate }: { application: Application; onUpdate: (patch: Partial<Omit<Application, "id">>) => void }) {
  return <div className="border-t border-border/60 p-4 space-y-4">
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Company" value={application.company} onChange={(company) => onUpdate({ company })} />
      <Field label="Role" value={application.role} onChange={(role) => onUpdate({ role })} />
      <Field label="Requirement ID" value={application.requirementId} onChange={(requirementId) => onUpdate({ requirementId })} />
      <Field label="Resume file name" value={application.resumeFileName} onChange={(resumeFileName) => onUpdate({ resumeFileName })} />
      <Field label="Contact or referrer" value={application.contact} onChange={(contact) => onUpdate({ contact })} />
      <Field label="Eligibility" value={application.eligibility} onChange={(eligibility) => onUpdate({ eligibility })} placeholder="PR required" />
      <DateInput label="Date applied" value={application.dateApplied} onChange={(dateApplied) => onUpdate({ dateApplied })} />
      <DateInput label="Deadline" value={application.deadline} onChange={(deadline) => onUpdate({ deadline })} />
      <DateInput label="Response date" value={application.responseDate} onChange={(responseDate) => onUpdate({ responseDate })} />
      <DateInput label="Last follow-up" value={application.lastFollowUpDate} onChange={(lastFollowUpDate) => onUpdate({ lastFollowUpDate })} />
    </div>
    <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label><Select value={application.status} onValueChange={(status) => onUpdate({ status: status as ApplicationStatus })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label><Textarea className="mt-1" value={application.notes} onChange={(e) => onUpdate({ notes: e.target.value })} /></div>
    <div className="rounded-xl border border-border/60 p-3 bg-muted/40 space-y-3"><h4 className="font-semibold">Interview log</h4><Field label="Questions asked" value={application.interviewLog.questionsAsked} onChange={(questionsAsked) => onUpdate({ interviewLog: { ...application.interviewLog, questionsAsked } })} /><Field label="What went well" value={application.interviewLog.wentWell} onChange={(wentWell) => onUpdate({ interviewLog: { ...application.interviewLog, wentWell } })} /><Field label="One thing to change next time" value={application.interviewLog.changeNextTime} onChange={(changeNextTime) => onUpdate({ interviewLog: { ...application.interviewLog, changeNextTime } })} /></div>
    <p className="text-xs text-muted-foreground flex items-center gap-1"><Save className="h-3 w-3" /> Changes save automatically.</p>
  </div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}<Input className="mt-1" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>; }
function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}<Input className="mt-1" type="date" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }