import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResumeData {
  full_name: string;
  job_title: string;
  phone: string;
  email: string;
  location: string;
  summary: string;
  experience: { company: string; title: string; from: string; to: string; description: string }[];
  education: { institution: string; degree: string; from: string; to: string }[];
  skills: string[];
  languages: { name: string; level: string }[];
  certifications: { name: string; issuer: string; date: string }[];
  links: { label: string; url: string }[];
}

export type TemplateId = "classic" | "modern" | "elegant" | "minimal";

export const templates: { id: TemplateId; name: string; description: string }[] = [
  { id: "classic", name: "كلاسيكي", description: "تصميم تقليدي واضح ومناسب لجميع المجالات" },
  { id: "modern", name: "عصري", description: "تصميم حديث بألوان جذابة وتخطيط مميز" },
  { id: "elegant", name: "أنيق", description: "تصميم راقي بخطوط نظيفة وتنسيق احترافي" },
  { id: "minimal", name: "بسيط", description: "تصميم مختصر يركز على المحتوى الأساسي" },
];

const font = { fontFamily: "'Cairo', sans-serif" };

// ─── Classic Template ───
function ClassicTemplate({ resume }: { resume: ResumeData }) {
  return (
    <div className="bg-card border rounded-xl p-8" id="resume-preview">
      <div className="text-center border-b border-border pb-6 mb-6">
        <h1 className="text-3xl font-bold text-foreground" style={font}>{resume.full_name}</h1>
        {resume.job_title && <p className="text-lg text-primary mt-1" style={font}>{resume.job_title}</p>}
        <div className="flex flex-wrap justify-center gap-4 mt-3 text-sm text-muted-foreground">
          {resume.email && <span>{resume.email}</span>}
          {resume.phone && <span dir="ltr">{resume.phone}</span>}
          {resume.location && <span>{resume.location}</span>}
        </div>
      </div>
      <SectionBlock title="الملخص المهني" show={!!resume.summary}>
        <p className="text-sm text-muted-foreground leading-relaxed" style={font}>{resume.summary}</p>
      </SectionBlock>
      <ExperienceBlock experience={resume.experience} />
      <EducationBlock education={resume.education} />
      <SkillsBlock skills={resume.skills} />
      <LanguagesBlock languages={resume.languages} />
      <CertificationsBlock certifications={resume.certifications} />
      <LinksBlock links={resume.links} />
    </div>
  );
}

// ─── Modern Template ───
function ModernTemplate({ resume }: { resume: ResumeData }) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden" id="resume-preview">
      {/* Header with accent */}
      <div className="bg-primary/10 px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground" style={font}>{resume.full_name}</h1>
        {resume.job_title && <p className="text-base text-primary font-semibold mt-1" style={font}>{resume.job_title}</p>}
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
          {resume.email && <span className="bg-background/60 px-2 py-0.5 rounded">{resume.email}</span>}
          {resume.phone && <span className="bg-background/60 px-2 py-0.5 rounded" dir="ltr">{resume.phone}</span>}
          {resume.location && <span className="bg-background/60 px-2 py-0.5 rounded">{resume.location}</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-0">
        {/* Sidebar */}
        <div className="col-span-1 bg-muted/30 p-6 space-y-6 border-l border-border">
          {resume.skills.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider" style={font}>المهارات</h2>
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map((s, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full" style={font}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {resume.languages.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider" style={font}>اللغات</h2>
              {resume.languages.map((l, i) => (
                <div key={i} className="text-sm mb-1" style={font}>{l.name} <span className="text-muted-foreground">— {l.level}</span></div>
              ))}
            </div>
          )}
          {resume.certifications.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider" style={font}>الشهادات</h2>
              {resume.certifications.map((c, i) => (
                <div key={i} className="text-sm mb-2" style={font}>
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <br /><span className="text-muted-foreground text-xs">{c.issuer} • {c.date}</span>
                </div>
              ))}
            </div>
          )}
          {resume.links.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider" style={font}>الروابط</h2>
              {resume.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block mb-1">{l.label}</a>
              ))}
            </div>
          )}
        </div>
        {/* Main content */}
        <div className="col-span-2 p-6 space-y-5">
          {resume.summary && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider" style={font}>الملخص المهني</h2>
              <p className="text-sm text-muted-foreground leading-relaxed" style={font}>{resume.summary}</p>
            </div>
          )}
          {resume.experience.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider" style={font}>الخبرات العملية</h2>
              {resume.experience.map((exp, i) => (
                <div key={i} className="mb-4 pr-4 border-r-2 border-primary/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm" style={font}>{exp.title}</h3>
                      <p className="text-xs text-primary" style={font}>{exp.company}</p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{exp.from} - {exp.to || "الحالي"}</span>
                  </div>
                  {exp.description && <p className="text-xs text-muted-foreground mt-1.5" style={font}>{exp.description}</p>}
                </div>
              ))}
            </div>
          )}
          {resume.education.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider" style={font}>التعليم</h2>
              {resume.education.map((edu, i) => (
                <div key={i} className="mb-3 pr-4 border-r-2 border-primary/30 flex justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm" style={font}>{edu.degree}</h3>
                    <p className="text-xs text-primary" style={font}>{edu.institution}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{edu.from} - {edu.to || "الحالي"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Elegant Template ───
function ElegantTemplate({ resume }: { resume: ResumeData }) {
  return (
    <div className="bg-card border rounded-xl p-8" id="resume-preview">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-primary pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight" style={font}>{resume.full_name}</h1>
          {resume.job_title && <p className="text-base text-primary mt-0.5 font-medium" style={font}>{resume.job_title}</p>}
        </div>
        <div className="text-left text-xs text-muted-foreground space-y-0.5">
          {resume.email && <div>{resume.email}</div>}
          {resume.phone && <div dir="ltr">{resume.phone}</div>}
          {resume.location && <div>{resume.location}</div>}
        </div>
      </div>
      {resume.summary && (
        <div className="mb-6 bg-muted/30 rounded-lg p-4 border-r-4 border-primary">
          <p className="text-sm text-muted-foreground leading-relaxed italic" style={font}>{resume.summary}</p>
        </div>
      )}
      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-3 space-y-6">
          <ExperienceBlock experience={resume.experience} accentStyle />
          <EducationBlock education={resume.education} accentStyle />
        </div>
        <div className="col-span-2 space-y-6">
          {resume.skills.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 pb-1 border-b border-border" style={font}>المهارات</h2>
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs" style={font}>{s}</Badge>
                ))}
              </div>
            </div>
          )}
          <LanguagesBlock languages={resume.languages} compact />
          <CertificationsBlock certifications={resume.certifications} compact />
          <LinksBlock links={resume.links} />
        </div>
      </div>
    </div>
  );
}

// ─── Minimal Template ───
function MinimalTemplate({ resume }: { resume: ResumeData }) {
  return (
    <div className="bg-card border rounded-xl p-8 space-y-5" id="resume-preview">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={font}>{resume.full_name}</h1>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
          {resume.job_title && <span className="font-semibold text-primary">{resume.job_title}</span>}
          {resume.email && <span>• {resume.email}</span>}
          {resume.phone && <span dir="ltr">• {resume.phone}</span>}
          {resume.location && <span>• {resume.location}</span>}
        </div>
      </div>
      {resume.summary && <p className="text-sm text-muted-foreground leading-relaxed" style={font}>{resume.summary}</p>}
      {resume.experience.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-2" style={font}>الخبرات</h2>
          <div className="space-y-3">
            {resume.experience.map((exp, i) => (
              <div key={i}>
                <div className="text-sm"><span className="font-semibold text-foreground" style={font}>{exp.title}</span> <span className="text-muted-foreground">في {exp.company}</span> <span className="text-xs text-muted-foreground">({exp.from} - {exp.to || "الحالي"})</span></div>
                {exp.description && <p className="text-xs text-muted-foreground mt-0.5" style={font}>{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {resume.education.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-2" style={font}>التعليم</h2>
          {resume.education.map((edu, i) => (
            <div key={i} className="text-sm mb-1">
              <span className="font-semibold text-foreground" style={font}>{edu.degree}</span> <span className="text-muted-foreground">— {edu.institution}</span> <span className="text-xs text-muted-foreground">({edu.from} - {edu.to || "الحالي"})</span>
            </div>
          ))}
        </div>
      )}
      {resume.skills.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-2" style={font}>المهارات</h2>
          <p className="text-sm text-muted-foreground" style={font}>{resume.skills.join(" • ")}</p>
        </div>
      )}
      {(resume.languages.length > 0 || resume.certifications.length > 0) && (
        <div className="flex gap-8">
          {resume.languages.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-1" style={font}>اللغات</h2>
              <p className="text-sm text-muted-foreground" style={font}>{resume.languages.map(l => `${l.name} (${l.level})`).join(" • ")}</p>
            </div>
          )}
          {resume.certifications.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-1" style={font}>الشهادات</h2>
              <p className="text-sm text-muted-foreground" style={font}>{resume.certifications.map(c => c.name).join(" • ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared sub-blocks ───
function SectionBlock({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-foreground border-b border-border pb-1 mb-3" style={font}>{title}</h2>
      {children}
    </div>
  );
}

function ExperienceBlock({ experience, accentStyle }: { experience: ResumeData["experience"]; accentStyle?: boolean }) {
  if (!experience.length) return null;
  return (
    <div className="mb-6">
      <h2 className={cn("text-lg font-bold text-foreground border-b pb-1 mb-3", accentStyle ? "border-primary" : "border-border")} style={font}>الخبرات العملية</h2>
      {experience.map((exp, i) => (
        <div key={i} className="mb-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-semibold text-foreground" style={font}>{exp.title}</h3>
              <p className="text-sm text-primary" style={font}>{exp.company}</p>
            </div>
            <span className="text-xs text-muted-foreground">{exp.from} - {exp.to || "الحالي"}</span>
          </div>
          {exp.description && <p className="text-sm text-muted-foreground mt-1" style={font}>{exp.description}</p>}
        </div>
      ))}
    </div>
  );
}

function EducationBlock({ education, accentStyle }: { education: ResumeData["education"]; accentStyle?: boolean }) {
  if (!education.length) return null;
  return (
    <div className="mb-6">
      <h2 className={cn("text-lg font-bold text-foreground border-b pb-1 mb-3", accentStyle ? "border-primary" : "border-border")} style={font}>التعليم</h2>
      {education.map((edu, i) => (
        <div key={i} className="mb-3 flex justify-between">
          <div>
            <h3 className="font-semibold text-foreground" style={font}>{edu.degree}</h3>
            <p className="text-sm text-primary" style={font}>{edu.institution}</p>
          </div>
          <span className="text-xs text-muted-foreground">{edu.from} - {edu.to || "الحالي"}</span>
        </div>
      ))}
    </div>
  );
}

function SkillsBlock({ skills }: { skills: string[] }) {
  if (!skills.length) return null;
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-foreground border-b border-border pb-1 mb-3" style={font}>المهارات</h2>
      <div className="flex flex-wrap gap-2">
        {skills.map((s, i) => <Badge key={i} variant="secondary" style={font}>{s}</Badge>)}
      </div>
    </div>
  );
}

function LanguagesBlock({ languages, compact }: { languages: ResumeData["languages"]; compact?: boolean }) {
  if (!languages.length) return null;
  return (
    <div className={compact ? "" : "mb-6"}>
      <h2 className={cn("font-bold text-foreground border-b pb-1 mb-3", compact ? "text-sm border-border" : "text-lg border-border")} style={font}>اللغات</h2>
      <div className="flex flex-wrap gap-4">
        {languages.map((l, i) => (
          <span key={i} className="text-sm" style={font}>{l.name} — <span className="text-muted-foreground">{l.level}</span></span>
        ))}
      </div>
    </div>
  );
}

function CertificationsBlock({ certifications, compact }: { certifications: ResumeData["certifications"]; compact?: boolean }) {
  if (!certifications.length) return null;
  return (
    <div className={compact ? "" : "mb-6"}>
      <h2 className={cn("font-bold text-foreground border-b pb-1 mb-3", compact ? "text-sm border-border" : "text-lg border-border")} style={font}>الشهادات</h2>
      {certifications.map((c, i) => (
        <div key={i} className="mb-2 flex justify-between">
          <div>
            <span className="font-semibold text-foreground text-sm" style={font}>{c.name}</span>
            <span className="text-sm text-muted-foreground mr-2" style={font}>— {c.issuer}</span>
          </div>
          <span className="text-xs text-muted-foreground">{c.date}</span>
        </div>
      ))}
    </div>
  );
}

function LinksBlock({ links }: { links: ResumeData["links"] }) {
  if (!links.length) return null;
  return (
    <div>
      <h2 className="text-sm font-bold text-foreground border-b border-border pb-1 mb-3" style={font}>الروابط</h2>
      <div className="flex flex-wrap gap-4">
        {links.map((l, i) => (
          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{l.label}</a>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ───
export function ResumePreview({ resume, templateId }: { resume: ResumeData; templateId: TemplateId }) {
  switch (templateId) {
    case "modern": return <ModernTemplate resume={resume} />;
    case "elegant": return <ElegantTemplate resume={resume} />;
    case "minimal": return <MinimalTemplate resume={resume} />;
    default: return <ClassicTemplate resume={resume} />;
  }
}
