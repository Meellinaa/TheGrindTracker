import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { STATUS_META } from "@/data/jobs";
import { roleKey, type JobState, type Role } from "@/hooks/use-job-tracker";
import { DateField, ResumeUploader, StatusButtons } from "@/components/track-fields";

export function RolesSection({
  jobId,
  suggested,
  roles,
  get,
  update,
  addRole,
  removeRole,
}: {
  jobId: string;
  suggested: string[];
  roles: Role[];
  get: (id: string) => JobState;
  update: (id: string, patch: Partial<JobState>) => void;
  addRole: (jobId: string, role: { title: string; link?: string; location?: string }) => string;
  removeRole: (jobId: string, roleId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const existing = new Set(roles.map((r) => r.title.toLowerCase()));
  const quickAdds = suggested.filter((s) => s && !existing.has(s.toLowerCase()));

  const submit = () => {
    if (!title.trim()) return;
    const id = addRole(jobId, { title: title.trim(), link: link.trim() || undefined });
    setTitle("");
    setLink("");
    setOpenId(id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Roles at this company
        </label>
        <span className="text-xs text-muted-foreground">{roles.length} tracked</span>
      </div>

      {roles.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No roles yet — add each posting you apply to and track them separately. 🌸
        </p>
      )}

      <div className="space-y-2">
        {roles.map((r) => {
          const key = roleKey(jobId, r.id);
          const st = get(key);
          const meta = STATUS_META[st.status];
          const open = openId === r.id;
          return (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
              <div className="absolute-none h-1 w-full" style={{ background: meta.color, opacity: st.status === "not-started" ? 0.3 : 1 }} />
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(open ? null : r.id)}>
                    <p className="font-semibold text-sm truncate">{r.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge
                        variant="secondary"
                        className="text-[11px] rounded-full border-0"
                        style={{ background: `color-mix(in oklab, ${meta.color} 40%, transparent)`, color: "var(--foreground)" }}
                      >
                        {meta.emoji} {meta.label}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[11px] rounded-full border-0"
                        style={{
                          background: st.resumeReady
                            ? "color-mix(in oklab, var(--success) 40%, transparent)"
                            : "color-mix(in oklab, var(--warning) 40%, transparent)",
                          color: "var(--foreground)",
                        }}
                      >
                        {st.resumeReady ? (st.resumeFile ? `📎 ${st.resumeFile.name.slice(0, 16)}` : "✅ Resume") : "📝 No resume"}
                      </Badge>
                      {st.closesOn && (
                        <Badge variant="secondary" className="text-[11px] rounded-full">
                          ⏳ closes {st.closesOn}
                        </Badge>
                      )}
                    </div>
                  </button>
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary mt-1">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpenId(open ? null : r.id)}>
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRole(jobId, r.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                {open && (
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                    <StatusButtons value={st.status} onChange={(s) => update(key, { status: s })} compact />
                    <ResumeUploader state={st} onChange={(p) => update(key, p)} idSuffix={key} />
                    <div className="grid grid-cols-2 gap-2">
                      <DateField label="Opens" value={st.opensOn} onChange={(v) => update(key, { opensOn: v })} />
                      <DateField label="Closes" value={st.closesOn} onChange={(v) => update(key, { closesOn: v })} />
                    </div>
                    <DateField label="Applied on" value={st.appliedOn} onChange={(v) => update(key, { appliedOn: v })} />
                    <Textarea
                      value={st.notes ?? ""}
                      onChange={(e) => update(key, { notes: e.target.value })}
                      placeholder="Recruiter, referral, interview prep for this role…"
                      rows={2}
                    />
                    {st.timeline && st.timeline.length > 0 && (
                      <ol className="space-y-1.5 relative border-l-2 border-border/60 pl-4">
                        {st.timeline.map((t, i) => (
                          <li key={i} className="text-xs relative">
                            <span
                              className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background"
                              style={{ background: STATUS_META[t.status].color }}
                            />
                            <span className="font-semibold">
                              {STATUS_META[t.status].emoji} {STATUS_META[t.status].label}
                            </span>
                            <span className="text-muted-foreground ml-2">{t.date}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {quickAdds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickAdds.map((s) => (
            <button
              key={s}
              onClick={() => setOpenId(addRole(jobId, { title: s }))}
              className="text-xs px-2.5 py-1 rounded-full border border-dashed border-primary/50 text-primary hover:bg-primary/10 transition"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Role title (e.g. Product Manager Intern)"
          className="h-9 text-sm"
        />
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Posting link (optional)"
          className="h-9 text-sm w-[40%]"
        />
        <Button size="sm" onClick={submit} className="gradient-hero text-primary-foreground border-0 shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
