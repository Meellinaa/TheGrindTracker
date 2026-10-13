import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Trash2 } from "lucide-react";
import { STATUS_META, type AppStatus } from "@/data/jobs";
import type { JobState, ResumeFile } from "@/hooks/use-job-tracker";

export const STATUSES: AppStatus[] = [
  "not-started",
  "researching",
  "applied",
  "interview",
  "offer",
  "rejected",
];

export function StatusButtons({
  value,
  onChange,
  compact,
}: {
  value: AppStatus;
  onChange: (s: AppStatus) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-3 gap-1.5"}>
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`${compact ? "px-2.5 py-1" : "px-2 py-2"} text-xs rounded-lg border font-medium transition-all hover:scale-105`}
          style={{
            background: value === s ? STATUS_META[s].color : "transparent",
            borderColor: value === s ? STATUS_META[s].color : "var(--border)",
            color: "var(--foreground)",
          }}
        >
          {STATUS_META[s].emoji} {STATUS_META[s].label}
        </button>
      ))}
    </div>
  );
}

export function ResumeUploader({
  state,
  onChange,
  idSuffix = "",
}: {
  state: JobState;
  onChange: (patch: Partial<JobState>) => void;
  idSuffix?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Please pick a file under 5MB 💗");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rf: ResumeFile = { name: file.name, dataUrl: reader.result as string, size: file.size };
      onChange({ resumeFile: rf, resumeReady: true });
    };
    reader.readAsDataURL(file);
  };

  const id = `resume-ready-${idSuffix}`;

  return (
    <div className="rounded-xl border border-border/60 p-3 bg-muted/40">
      <div className="flex items-center gap-2 mb-2">
        <Checkbox id={id} checked={state.resumeReady} onCheckedChange={(v) => onChange({ resumeReady: !!v })} />
        <label htmlFor={id} className="text-sm font-medium cursor-pointer">
          Resume tailored &amp; ready 💕
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
        <Button size="sm" variant="outline" className="w-full rounded-lg" onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-2" /> Upload resume (PDF/DOC)
        </Button>
      )}
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}

export function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}
