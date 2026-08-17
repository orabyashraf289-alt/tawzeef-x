# TawzeefX — Full Screen & UI Component Inventory

**Audit Date:** 2026-08-17  
**Total Screens/Pages:** 58  
**Total Components:** 66+  
**Design System:** Google Material Design 3 (MD3)

---

## 1. SCREEN INVENTORY & ACCESS CONTROL MATRIX

| # | Screen Name | File Path | Route Path | Access Level / Role | Forms / User Actions | Risk Level |
|---|-------------|-----------|------------|---------------------|----------------------|------------|
| 1 | **Landing Page** | `src/pages/LandingPage.tsx` | `/` | Public | Live stats view, CTA redirects, Interactive Demo tab switcher | Low |
| 2 | **Authentication** | `src/pages/Auth.tsx` | `/auth` | Public | Login form, Signup form, OTP request/verify, Google/LinkedIn OAuth | **Critical** |
| 3 | **Forgot Password** | `src/pages/ForgotPassword.tsx` | `/forgot-password` | Public | Request reset email form, email validation | High |
| 4 | **Reset Password** | `src/pages/ResetPassword.tsx` | `/reset-password` | Public (token required) | Password update form with strength meter, token validation | **Critical** |
| 5 | **Public Job Board** | `src/pages/Careers.tsx` | `/careers` | Public | Search jobs, filter by department/type/location, view job preview | Medium |
| 6 | **Apply for Job** | `src/pages/ApplyJob.tsx` | `/apply/:id` | Public | Resume upload (PDF/DOCX), application form, questionnaire, personal data | **Critical** |
| 7 | **Candidate Portal** | `src/pages/CandidatePortal.tsx` | `/portal` | Public | Tracking code search, application status lookup, timeline view | High |
| 8 | **Book Interview** | `src/pages/BookInterview.tsx` | `/book/:candidateId` | Public (token/candidateId) | Time slot selection, timezone picker, confirmation form | High |
| 9 | **Offer Portal** | `src/pages/OfferPortal.tsx` | `/offer/:token` | Public (secure token) | Digital signature canvas, accept/reject offer, PDF download | **Critical** |
| 10 | **Take Assessment** | `src/pages/TakeAssessment.tsx` | `/assessment/:token` | Public (secure token) | Timed multiple choice/text exam, code submission, auto-submit | High |
| 11 | **Video Meeting Room**| `src/pages/VideoRoom.tsx` | `/meeting/:roomId` | Public (roomId) | WebRTC video/audio call, screen sharing, transcription viewer | High |
| 12 | **PWA Install** | `src/pages/Install.tsx` | `/install` | Public | PWA install trigger button, instructions | Low |
| 13 | **Accept Invitation** | `src/pages/AcceptInvitation.tsx`| `/invitation/:token` | Public (token) | Accept team/agency invitation, set password | **Critical** |
| 14 | **Pricing Page** | `src/pages/Pricing.tsx` | `/pricing` | Public | View tiers, checkout modal trigger, plan switcher | Medium |
| 15 | **About Us** | `src/pages/About.tsx` | `/about` | Public | Informational | Low |
| 16 | **Features** | `src/pages/Features.tsx` | `/features` | Public | Interactive feature showcase | Low |
| 17 | **Contact Us** | `src/pages/Contact.tsx` | `/contact` | Public | Contact form submission, email validation | Medium |
| 18 | **Blog List** | `src/pages/Blog.tsx` | `/blog` | Public | Search articles, category filter | Low |
| 19 | **Blog Post** | `src/pages/BlogPost.tsx` | `/blog/:slug` | Public | Reading view, social sharing buttons | Low |
| 20 | **Privacy Policy** | `src/pages/Privacy.tsx` | `/privacy` | Public | Legal disclosure | Low |
| 21 | **Terms of Service** | `src/pages/Terms.tsx` | `/terms` | Public | Legal disclosure | Low |
| 22 | **Onboarding** | `src/pages/Onboarding.tsx` | `/onboarding` | Authenticated (all roles) | Organization profile setup, company branding, role selection | High |
| 23 | **Job Seeker Dash** | `src/pages/JobSeekerDashboard.tsx`| `/seeker-dashboard` | Authenticated (job_seeker) | Profile edit, applied jobs list, resume archive, offer tracker | High |
| 24 | **Company Portal** | `src/pages/CompanyPortal.tsx` | `/company` | Authenticated (company members)| Organization details, branch list, team summary | High |
| 25 | **Agency Portal** | `src/pages/AgencyPortal.tsx` | `/agency` | Authenticated (agencies) | Assigned candidate list, client companies, commission tracking | High |
| 26 | **Recruiter Dashboard**| `src/pages/Dashboard.tsx` / `src/components/RecruiterDashboard.tsx` | `/dashboard` | Admin, Recruiter, Reviewer | KPIs, activity feed, pipeline shortcuts, hiring goals widget | High |
| 27 | **Jobs Management** | `src/pages/Jobs.tsx` | `/jobs` | Admin, Recruiter, Reviewer | Add/Edit job dialog, change status, share job modal, QR code dialog | **Critical** |
| 28 | **Job Details** | `src/pages/JobDetails.tsx` | `/jobs/:id` | Admin, Recruiter, Reviewer | Job info edit, candidate list for job, stage distribution, share | High |
| 29 | **Candidates List** | `src/pages/Candidates.tsx` | `/candidates` | Admin, Recruiter, Reviewer | Add candidate, batch AI evaluate, filter by score/stage, compare | **Critical** |
| 30 | **Candidate Profile**| `src/pages/CandidateProfile.tsx`| `/candidates/:id` | Admin, Recruiter, Reviewer | Scorecard rating, notes, stage move, schedule interview, send offer | **Critical** |
| 31 | **AI Assistant** | `src/pages/AIAssistant.tsx` | `/ai-assistant` | Admin, Recruiter, Reviewer | Prompt chat, JD generation, interview question generator, ranking | High |
| 32 | **Reports & KPIs** | `src/pages/Reports.tsx` | `/reports` | Admin, Recruiter, Reviewer | 12 report tabs, Recharts analytics, PDF export, Excel XLSX export | High |
| 33 | **Interviews** | `src/pages/Interviews.tsx` | `/interviews` | Admin, Recruiter, Reviewer | Calendar/list view, schedule interview dialog, video room launcher | High |
| 34 | **Notifications** | `src/pages/Notifications.tsx` | `/notifications` | Admin, Recruiter, Reviewer | Mark read/unread, clear all, notification filter | Medium |
| 35 | **Pipeline Kanban** | `src/pages/Pipeline.tsx` | `/pipeline` | Admin, Recruiter, Reviewer | Drag-and-drop candidates across stages, stage action drawers | **Critical** |
| 36 | **Job Offers** | `src/pages/Offers.tsx` | `/offers` | Admin, Recruiter, Reviewer | Create offer modal, salary calculator, send offer email, revoke | **Critical** |
| 37 | **Settings** | `src/pages/Settings.tsx` | `/settings` | Admin, Recruiter, Reviewer | Company profile, permissions matrix, billing, SMTP, webhook configs | **Critical** |
| 38 | **Hiring Plan** | `src/pages/HiringPlan.tsx` | `/hiring-plan` | Admin, Recruiter, Reviewer | Monthly targets, headcount goals edit drawer, budget tracking | High |
| 39 | **Interactive Tutorial**| `src/pages/Tutorial.tsx` | `/tutorial` | Admin, Recruiter, Reviewer | Guided platform walkthrough, video guides | Low |
| 40 | **Talent Pool** | `src/pages/TalentPool.tsx` | `/talent-pool` | Admin, Recruiter, Reviewer | Skill-based search, archive candidates, talent tagging | High |
| 41 | **Task Board** | `src/pages/TaskBoard.tsx` | `/task-board` | Admin, Recruiter, Reviewer | Kanban task management, assign tasks, due dates, status updates | Medium |
| 42 | **Performance Eval** | `src/pages/PerformanceEvaluation.tsx`| `/performance-evaluation` | Admin, Recruiter, Reviewer | Employee 360 review, rating criteria, goal evaluation, feedback | High |
| 43 | **Question Bank** | `src/pages/QuestionBank.tsx` | `/question-bank` | Admin, Recruiter | Create question, categorize by skill/difficulty, AI generate | High |
| 44 | **Resume Archive** | `src/pages/ResumeArchive.tsx` | `/resume-archive` | Admin, Recruiter, Reviewer | PDF viewer, OCR text search, bulk parse, tag candidates | High |
| 45 | **Workflow Editor** | `src/pages/WorkflowEditor.tsx`| `/workflow` | Admin, Recruiter | Visual pipeline editor, trigger automated actions on stage move | **Critical** |
| 46 | **Checklist Tracker**| `src/pages/ChecklistTracker.tsx`| `/checklist-tracker` | Admin, Recruiter | Onboarding/Offboarding task lists, candidate task assignment | Medium |
| 47 | **Company Agencies** | `src/pages/CompanyAgencies.tsx`| `/company/agencies` | Admin, Recruiter | Invite recruiting agency, assign jobs, commission agreement | High |
| 48 | **Audit Log** | `src/pages/AuditLog.tsx` | `/audit-log` | Admin, Recruiter | Filter security audit logs, export logs, user activity inspection | High |
| 49 | **Team Management** | `src/pages/TeamManagement.tsx`| `/team` | Admin Only | Invite member, change role (admin/recruiter/reviewer), remove member | **Critical** |
| 50 | **Admin Blog Manager**| `src/pages/BlogAdmin.tsx` | `/admin/blog` | Super Admin Only | Markdown editor, publish/unpublish article, upload cover image | High |
| 51 | **Admin Companies** | `src/pages/AdminCompanies.tsx`| `/admin/companies` | Super Admin Only | Tenant list, subscription override, company status toggle | **Critical** |
| 52 | **Company Details** | `src/pages/AdminCompanyDetail.tsx`| `/admin/companies/:id` | Super Admin Only | Tenant deep dive, member list, storage metrics, manual plan assign | **Critical** |
| 53 | **Admin Agencies** | `src/pages/AdminAgencies.tsx` | `/admin/agencies` | Super Admin Only | Agency global list, verification toggle, contract review | High |
| 54 | **Quality Report** | `src/pages/QualityReport.tsx` | `/admin/quality` | Super Admin Only | Code health metrics, test pass status, performance charts | Medium |
| 55 | **System Roadmap** | `src/pages/Roadmap.tsx` | `/roadmap` | Super Admin Only | Feature delivery roadmap, version changelog | Low |
| 56 | **404 Not Found** | `src/pages/NotFound.tsx` | `*` (Catch-all) | Public | Redirect back to home | Low |
| 57 | **403 Unauthorized** | `src/pages/Unauthorized.tsx` | Dynamic | Public/Auth | Access denied notice with back button | Low |
| 58 | **Typography Test** | `src/pages/TypographyTest.tsx`| `/typography` (Dev only)| Dev only | Arabic text rendering and clipping regression test | Low |

---

## 2. MODALS, DIALOGS & SLIDEOUT PANELS INVENTORY

| Modal / Dialog Component | Trigger Location | Purpose / Data Captured |
|--------------------------|------------------|-------------------------|
| `AddJobDialog.tsx` | Jobs screen (`/jobs`) | Job title, description, skills, salary range, branch, deadline |
| `JobPreviewDialog.tsx` | Jobs screen (`/jobs`) | Formatted JD preview with apply link |
| `ShareJobDialog.tsx` | Jobs / JobDetails | Copy link, social share (LinkedIn, Twitter, WhatsApp), QR code |
| `QRCodeDialog.tsx` | Jobs screen | Generate dynamic QR code for mobile application |
| `AICandidateComparisonModal.tsx`| Candidates screen | Compare up to 4 candidates side-by-side on AI match score & skills |
| `AICandidateInsights.tsx`| Candidate Profile | AI summary, strengths, weaknesses, interview recommendations |
| `CheckoutModal.tsx` | Settings / Pricing | Subscription tier selection, billing cycle, payment gateway link |
| `CommandPalette.tsx` | Global (`Cmd+K` / `Ctrl+K`) | Fast search across jobs, candidates, and navigation shortcuts |
| `KPIDetailsDialog.tsx` | Dashboard / Reports | Deep-dive breakdown of individual KPI calculation & historical trends |
| `TaskDetailModal.tsx` | TaskBoard (`/task-board`) | Task title, assignee, priority, status, subtasks, notes |
| `SemanticSearchDialog.tsx`| Candidates / TalentPool | Natural language candidate search using AI embeddings |
| `CompanyInvitationsPanel.tsx`| Settings (`/settings`) | Send email invitation with role assignment |
| `PermissionsMatrixManager.tsx`| Settings (`/settings`) | Toggle screen-level permissions per custom/standard role |
| `PipelineStagesManager.tsx`| Settings / Pipeline | Reorder, add, rename, and delete custom hiring pipeline stages |
| `StageActions.tsx` | Pipeline (`/pipeline`) | Execute automated actions (send email, schedule interview, reject) |
| `StageDetailPanel.tsx` | Pipeline (`/pipeline`) | Slideout showing full candidate profile without leaving Kanban |
| `WebhookSettings.tsx` | Settings (`/settings`) | Register outgoing webhook URLs with event triggers & secret signing |

---

*Generated by Full System Engineering Audit — Screen Inventory Complete*
