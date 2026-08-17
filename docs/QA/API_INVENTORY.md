# TawzeefX — Full API & Edge Function Inventory

**Audit Date:** 2026-08-17  
**Total Supabase Edge Functions:** 37  
**Total Database RPCs:** 25+  
**Security Standard:** OWASP Top 10 API Security Risks (2023)

---

## 1. SUPABASE EDGE FUNCTIONS INVENTORY

| # | Function Name | Endpoint Path | Method | Auth Required | Input Schema | Output Schema | Risk Level | Security Controls |
|---|---------------|---------------|--------|---------------|--------------|---------------|------------|-------------------|
| 1 | `request-login-otp` | `/functions/v1/request-login-otp` | POST | None (Public) | `{ email: string }` | `{ success: boolean, message: string }` | **Critical** | IP Rate limit (3/min), Email norm, SHA-256 OTP hashing, Domain CORS |
| 2 | `verify-login-otp` | `/functions/v1/verify-login-otp` | POST | None (Public) | `{ email: string, code: string, user_agent?: string }` | `{ session: Object, trusted: boolean }` | **Critical** | 5 attempts lockout, 10 min expiration, Domain CORS |
| 3 | `request-password-reset`| `/functions/v1/request-password-reset`| POST | None (Public) | `{ email: string }` | `{ success: boolean, message: string }` | **High** | IP Rate limit, Generic response (no email enum leak), Secure token |
| 4 | `execute-password-reset`| `/functions/v1/execute-password-reset`| POST | None (Public) | `{ token: string, password: string }` | `{ success: boolean }` | **Critical** | Token single-use check, expiry check, strong password validation |
| 5 | `send-email` | `/functions/v1/send-email` | POST | Bearer JWT / Service | `{ to, subject, html, user_id?, email_type? }` | `{ success: boolean, messageId: string }` | **Critical** | Dynamic CORS, AES-GCM credential decrypt, Sender validation |
| 6 | `send-application-confirmation`| `/functions/v1/send-application-confirmation`| POST | Service Role | `{ applicant_email, applicant_name, job_id, job_title }` | `{ success: boolean }` | High | Dynamic CORS, AES-GCM credential decrypt |
| 7 | `send-welcome-email` | `/functions/v1/send-welcome-email` | POST | Service Role | `{ user_id, email, full_name }` | `{ success: boolean }` | Medium | Service role auth only |
| 8 | `send-invitation` | `/functions/v1/send-invitation` | POST | Bearer JWT | `{ email, role, company_id }` | `{ success: boolean, token: string }` | High | Admin permission check, token generation |
| 9 | `send-assessment-results`| `/functions/v1/send-assessment-results`| POST | Service Role | `{ candidate_id, score, evaluation }` | `{ success: boolean }` | Medium | Service role auth only |
| 10 | `send-webhook` | `/functions/v1/send-webhook` | POST | Bearer JWT | `{ event: string, payload: Object, webhook_url: string }` | `{ status: number, response: string }` | High | HMAC-SHA256 signature header, URL validation (no internal IP SSRF) |
| 11 | `evaluate-candidate`| `/functions/v1/evaluate-candidate`| POST | Bearer JWT (Optional)| `{ candidateId: string, jobId: string }` | `{ score, strengths, weaknesses, recommendation }` | High | Dynamic CORS, Company access check, Fallback heuristic scoring |
| 12 | `auto-rank` | `/functions/v1/auto-rank` | POST | Bearer JWT | `{ jobId: string }` | `{ rankedCandidates: Array }` | Medium | Company access check |
| 13 | `analyze-sentiment` | `/functions/v1/analyze-sentiment` | POST | Bearer JWT | `{ text: string, type: string }` | `{ sentiment: string, score: number }` | Low | Auth required |
| 14 | `candidate-chatbot`| `/functions/v1/candidate-chatbot` | POST | None (Public) | `{ message: string, job_id?: string, session_id: string }`| `{ reply: string }` | Medium | Prompt injection filters, rate limit |
| 15 | `candidate-portal` | `/functions/v1/candidate-portal` | POST | None (Public) | `{ tracking_code: string, email?: string }` | `{ candidate: Object, applications: Array }` | **High** | RLS enforcement, sanitized output (no internal notes) |
| 16 | `chat` | `/functions/v1/chat` | POST | Bearer JWT | `{ messages: Array, systemPrompt?: string }` | `{ response: string }` | Medium | JWT auth required |
| 17 | `book-interview` | `/functions/v1/book-interview` | POST | None (Public) | `{ candidateId: string, slot_time: string, timezone: string }`| `{ success: boolean, interview: Object }` | High | Candidate ID validation, Slot conflict check |
| 18 | `elevenlabs-tts` | `/functions/v1/elevenlabs-tts` | POST | Bearer JWT | `{ text: string, voice_id?: string }` | `Audio buffer (audio/mpeg)` | Low | Rate limit per tenant |
| 19 | `elevenlabs-transcribe`| `/functions/v1/elevenlabs-transcribe`| POST | Bearer JWT | `{ audio_url: string }` | `{ transcript: string }` | Low | Auth required |
| 20 | `email-tracking-pixel`| `/functions/v1/email-tracking-pixel`| GET | None (Public) | `?tracking_id=string` | `1x1 transparent GIF` | Low | Read-only analytics |
| 21 | `evaluate-assessment-answers`| `/functions/v1/evaluate-assessment-answers`| POST | None (Token) | `{ token: string, answers: Array }` | `{ score: number, passed: boolean }` | High | Token verification, single submission check |
| 22 | `generate-assessment-questions`| `/functions/v1/generate-assessment-questions`| POST | Bearer JWT | `{ topic: string, level: string, count: number }` | `{ questions: Array }` | Low | Auth required |
| 23 | `generate-interview-questions`| `/functions/v1/generate-interview-questions`| POST | Bearer JWT | `{ role: string, skills: Array, seniority: string }` | `{ questions: Array }` | Low | Auth required |
| 24 | `generate-job-description`| `/functions/v1/generate-job-description`| POST | Bearer JWT | `{ title: string, department: string, requirements: Array }`| `{ description: string, formatted_md: string }` | Low | Auth required |
| 25 | `interview-reminders`| `/functions/v1/interview-reminders`| POST | Cron / Service | `{}` | `{ reminded_count: number }` | Low | Service key / Cron secret |
| 26 | `linkedin-oauth` | `/functions/v1/linkedin-oauth` | POST | None (Public) | `{ code: string, redirect_uri: string }` | `{ access_token: string, profile: Object }` | **High** | State CSRF validation, Secret masking |
| 27 | `linkedin-post` | `/functions/v1/linkedin-post` | POST | Bearer JWT | `{ content: string, job_id: string }` | `{ post_id: string, url: string }` | Medium | JWT auth required, permissions check |
| 28 | `log-audit-event` | `/functions/v1/log-audit-event` | POST | Bearer JWT | `{ action: string, resource: string, details: Object }` | `{ success: boolean }` | Medium | Auto-fills client IP and JWT user ID |
| 29 | `manage-smtp` | `/functions/v1/manage-smtp` | POST | Bearer JWT (Admin) | `{ host, port, user, pass, from_email, secure }` | `{ success: boolean }` | **Critical** | AES-GCM encryption, admin role check |
| 30 | `notify-stage-change`| `/functions/v1/notify-stage-change`| POST | Service Role | `{ candidate_id: string, old_stage: string, new_stage: string }`| `{ success: boolean }` | Medium | Service role auth |
| 31 | `og-apply` | `/functions/v1/og-apply` | GET | None (Public) | `?job_id=string` | `Dynamic SVG/PNG OpenGraph image` | Low | Public asset generation |
| 32 | `og-image` | `/functions/v1/og-image` | GET | None (Public) | `?title=string&company=string` | `Dynamic SVG/PNG OpenGraph image` | Low | Public asset generation |
| 33 | `parse-resume` | `/functions/v1/parse-resume` | POST | Bearer JWT | `{ file_url: string, file_type: string }` | `{ extracted_data: Object }` | High | Content-type check, Size limit, Timeout |
| 34 | `process-scheduled-emails`| `/functions/v1/process-scheduled-emails`| POST| Cron / Service | `{}` | `{ processed_count: number }` | Low | Service key / Cron secret |
| 35 | `semantic-search-candidates`| `/functions/v1/semantic-search-candidates`| POST| Bearer JWT | `{ query: string, company_id: string, limit?: number }`| `{ candidates: Array }` | Medium | Company tenant RLS check |
| 36 | `auto-create-candidate-account`| `/functions/v1/auto-create-candidate-account`| POST| Trigger / Service | `{ candidate_id: string }` | `{ user_id: string }` | High | Service role auth |
| 37 | `_shared` (rateLimiter, cors)| Internal Library | N/A | N/A | N/A | N/A | High | Core security middleware |

---

## 2. DATABASE RPC SECURITY AUDIT

| RPC Function Name | Security Type | Executed By | Purpose & Guard Controls |
|-------------------|---------------|-------------|--------------------------|
| `get_user_role(uid)` | SECURITY DEFINER | Authenticated | Returns current user's role with cache table lookup |
| `has_role(uid, role)` | SECURITY DEFINER | Authenticated | Checks if user has specific `app_role` |
| `has_company_access(cid)` | SECURITY DEFINER | Authenticated | Validates user membership in tenant or parent company |
| `is_company_owner(cid)` | SECURITY DEFINER | Authenticated | Validates owner role in tenant or parent company |
| `get_user_companies()` | SECURITY DEFINER | Authenticated | Returns list of accessible company IDs (prevents RLS recursion) |
| `is_super_admin()` | SECURITY DEFINER | Authenticated | Returns boolean if user has super admin flag |
| `get_offer_by_token(tok)` | SECURITY DEFINER | Public / Anon | Returns sanitized offer details matching token |
| `respond_to_offer(...)` | SECURITY DEFINER | Public / Anon | Updates offer status with signature check and idempotency |
| `get_assessment_by_token(tok)` | SECURITY DEFINER | Public / Anon | Returns assessment questions without correct answers |
| `submit_assessment(...)` | SECURITY DEFINER | Public / Anon | Grades and records assessment submission |
| `create_agency_account(...)` | SECURITY DEFINER | Super Admin | Creates and links agency tenant |

---

*Generated by Full System Engineering Audit — API Inventory Complete*
