import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-baseline justify-between border-b pb-2">
        <h3 className="text-sm font-semibold">Roles at this company</h3>
        <span className="text-xs text-muted-foreground">{roles.length} tracked</span>
      </div>

      {roles.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No roles yet. Add each job posting here to track it separately.
        </p>
      )}

      <div className="space-y-2">
        {roles.map((r) => {
          const key = roleKey(jobId, r.id);
          const st = get(key);
          const meta = STATUS_META[st.status];
          const open = openId === r.id;
          return (
            <div key={r.id} className="rounded-md border border-border bg-card overflow-hidden">
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start rounded-none p-0 text-left hover:bg-transparent" onClick={() => setOpenId(open ? null : r.id)}>
                    <span className="min-w-0">
                    <p className="font-semibold text-sm truncate">{r.title}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                      <span>{meta.label}</span>
                      <span>{st.resumeReady ? (st.resumeFile ? st.resumeFile.name.slice(0, 18) : "Resume ready") : "Resume needed"}</span>
                      {st.closesOn && <span>Closes {st.closesOn}</span>}
                    </div>
                    </span>
                  </Button>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              key={s}
              onClick={() => setOpenId(addRole(jobId, { title: s }))}
              className="h-7 text-xs"
            >
              + {s}
            </Button>
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
        <Button size="sm" onClick={submit} className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
