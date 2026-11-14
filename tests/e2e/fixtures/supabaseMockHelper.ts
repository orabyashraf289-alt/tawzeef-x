import { Page, Route } from "@playwright/test";
import {
  AppRole,
  MockHiringGoal,
  MockUser,
  currentMonthKey,
  mockAssessment,
  mockAssessmentResponses,
  mockCandidate,
  mockCompany,
  mockHiringGoals,
  mockIneligibleCandidate,
  mockInterview,
  mockInvitation,
  mockJob,
  mockOffer,
  mockPipelineStages,
  mockRolePermissions,
  mockSubscriptionPlans,
  mockTrackingCode,
  mockUser,
} from "./mockData";

export const SUPABASE_AUTH_STORAGE_KEY = "sb-rlfewneisuezsamhosct-auth-token";

export interface SetupSupabaseMocksOptions {
  role?: AppRole;
  user?: MockUser;
  isSuperAdmin?: boolean;
  hiringGoal?: MockHiringGoal | null;
}

interface GranularPermissionRecord {
  id: string;
  company_id: string;
  role_key: string;
  user_id: string | null;
  module_key: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  updated_at?: string;
}

function expectsSingleObject(route: Route): boolean {
  const accept = route.request().headers()["accept"] ?? "";
  return accept.includes("application/vnd.pgrst.object");
}

async function fulfillPostgrest(
  route: Route,
  rows: unknown[],
  singleOverride?: unknown,
  status = 200
) {
  const isSingle = expectsSingleObject(route);
  const payload = isSingle ? (singleOverride !== undefined ? singleOverride : rows[0] ?? null) : rows;
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

function parseBodyRecord(route: Route): Record<string, unknown> {
  try {
    const data = route.request().postDataJSON();
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function seedAuthSession(page: Page, user: MockUser = mockUser): Promise<void> {
  await page.addInitScript(
    ({ storageKey, sessionUser }) => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      window.localStorage.setItem("tawzeef-x-tour-completed", "true");
      window.sessionStorage.setItem("tx_welcome_video_viewed", "true");
      window.sessionStorage.removeItem("tx_show_welcome_video");
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: "mock-jwt-token-12345",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: nowSeconds + 3600,
          refresh_token: "mock-refresh-token",
          user: sessionUser,
        })
      );
    },
    { storageKey: SUPABASE_AUTH_STORAGE_KEY, sessionUser: user }
  );
}

export async function setupSupabaseMocks(
  page: Page,
  options?: SetupSupabaseMocksOptions
): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("tawzeef-x-tour-completed", "true");
    window.sessionStorage.setItem("tx_welcome_video_viewed", "true");
    window.sessionStorage.removeItem("tx_show_welcome_video");
  });

  const currentUser: MockUser = options?.user
    ? options.user
    : {
        ...mockUser,
        role: options?.role ?? mockUser.role,
      };

  const isSuperAdmin = options?.isSuperAdmin ?? currentUser.role === "admin";
  let storedHiringGoal: MockHiringGoal | null =
    options && "hiringGoal" in options ? (options.hiringGoal ?? null) : { ...mockHiringGoals };
  let storedGranularPermissions: GranularPermissionRecord[] = [];
  const makeSessionPayload = () => ({
    access_token: "mock-jwt-token-12345",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "mock-refresh-token",
    user: currentUser,
  });

  // Intercept Auth Session & Token endpoints
  await page.route("**/auth/v1/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeSessionPayload()),
    });
  });

  await page.route("**/auth/v1/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentUser),
    });
  });

  await page.route("**/auth/v1/token*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeSessionPayload()),
    });
  });

  await page.route("**/auth/v1/signup*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: currentUser,
        session: makeSessionPayload(),
      }),
    });
  });

  await page.route("**/auth/v1/logout*", async (route) => {
    await route.fulfill({
      status: 204,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // Security, Tenant & Role RPCs
  await page.route("**/rest/v1/rpc/validate_tenant_status*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_state: "ALLOWED",
        is_agency: false,
        is_candidate: currentUser.role === "job_seeker",
        is_platform_admin: isSuperAdmin,
      }),
    });
  });

  await page.route("**/rest/v1/rpc/is_super_admin*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(isSuperAdmin),
    });
  });

  await page.route("**/rest/v1/rpc/get_user_role*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentUser.role),
    });
  });

  await page.route("**/rest/v1/rpc/get_hiring_permissions*", async (route) => {
    const isAdminOrRecruiter = currentUser.role === "admin" || currentUser.role === "recruiter";
    const fullCrud = { read: true, create: isAdminOrRecruiter, edit: isAdminOrRecruiter, delete: currentUser.role === "admin" };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobs: fullCrud,
        candidates: fullCrud,
        interviews: fullCrud,
        offers: fullCrud,
        question_bank: fullCrud,
        assessment_responses: fullCrud,
      }),
    });
  });

  await page.route("**/rest/v1/rpc/get_public_job_employer*", async (route) => {
    await fulfillPostgrest(route, [{ name: mockCompany.name, logo_url: mockCompany.logo_url }]);
  });

  // User Roles, Profiles & Company Membership
  await page.route("**/rest/v1/user_roles*", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillPostgrest(route, [
        {
          id: "role-001",
          user_id: currentUser.id,
          role: currentUser.role,
          company_id: mockCompany.id,
          created_at: "2026-01-01T00:00:00Z",
        },
      ]);
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    }
  });

  await page.route("**/rest/v1/profiles*", async (route) => {
    await fulfillPostgrest(route, [
      {
        id: currentUser.id,
        user_id: currentUser.id,
        full_name: currentUser.user_metadata.full_name || "مستخدم النظام",
        role: currentUser.role,
        job_title: currentUser.role === "admin" ? "مدير التوظيف" : "أخصائي توظيف",
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
  });

  await page.route("**/rest/v1/companies*", async (route) => {
    await fulfillPostgrest(route, [mockCompany]);
  });

  await page.route("**/rest/v1/company_members*", async (route) => {
    const memberRole = currentUser.role === "admin" ? "owner" : currentUser.role === "reviewer" ? "viewer" : "hr";
    await fulfillPostgrest(route, [
      {
        id: "cm-001",
        company_id: mockCompany.id,
        user_id: currentUser.id,
        member_role: memberRole,
        branch_id: null,
        created_at: "2026-01-01T00:00:00Z",
        company: mockCompany,
        profiles: {
          user_id: currentUser.id,
          full_name: currentUser.user_metadata.full_name,
          job_title: null,
          avatar_url: null,
        },
      },
    ]);
  });

  // Permissions & Custom Roles
  await page.route("**/rest/v1/role_permissions*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockRolePermissions),
    });
  });

  await page.route("**/rest/v1/granular_permissions*", async (route) => {
    const method = route.request().method();
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      const body = route.request().postDataJSON();
      const incoming = Array.isArray(body) ? (body as GranularPermissionRecord[]) : [body as GranularPermissionRecord];
      storedGranularPermissions = incoming.map((row, idx) => ({
        ...row,
        id: row.id || `gp-${idx + 1}`,
      }));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(storedGranularPermissions),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(storedGranularPermissions),
      });
    }
  });

  await page.route("**/rest/v1/custom_roles*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  // Jobs & Applications
  await page.route("**/rest/v1/jobs*", async (route) => {
    if (route.request().method() === "POST") {
      const payload = parseBodyRecord(route);
      const created = {
        ...mockJob,
        ...payload,
        id: `job-${Date.now()}`,
      };
      await fulfillPostgrest(route, [created], created, 201);
    } else {
      await fulfillPostgrest(route, [mockJob]);
    }
  });

  await page.route("**/rest/v1/applications*", async (route) => {
    if (route.request().method() === "POST") {
      const payload = parseBodyRecord(route);
      const created = { id: `app-${Date.now()}`, ...payload };
      await fulfillPostgrest(route, [created], created, 201);
    } else {
      await fulfillPostgrest(route, []);
    }
  });

  // Candidates & Interviews
  await page.route("**/rest/v1/candidates*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await fulfillPostgrest(route, [mockCandidate, mockIneligibleCandidate]);
    } else if (method === "PATCH") {
      const patchData = parseBodyRecord(route);
      const updated = { ...mockCandidate, ...patchData };
      await fulfillPostgrest(route, [updated], updated);
    } else if (method === "POST") {
      const postData = parseBodyRecord(route);
      const created = { id: `cand-${Date.now()}`, ...postData };
      await fulfillPostgrest(route, [created], created, 201);
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    }
  });

  await page.route("**/rest/v1/interviews*", async (route) => {
    await fulfillPostgrest(route, [mockInterview]);
  });

  // Pipeline Stages & Automation
  await page.route("**/rest/v1/pipeline_stages*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockPipelineStages),
    });
  });

  await page.route("**/rest/v1/pipeline_sub_stages*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/rest/v1/automation_rules*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/rest/v1/stage_transitions*", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });

  await page.route("**/rest/v1/stage_history*", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });

  // Hiring Plan Goals
  await page.route("**/rest/v1/hiring_goals*", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "GET") {
      const monthMatch = url.match(/month=eq\.(\d{4}-\d{2})/);
      const requestedMonth = monthMatch?.[1];
      const matchesMonth = !requestedMonth || !storedHiringGoal || storedHiringGoal.month === requestedMonth;
      const rows = storedHiringGoal && matchesMonth ? [storedHiringGoal] : [];
      await fulfillPostgrest(route, rows, rows[0] ?? null);
    } else if (method === "POST") {
      const body = parseBodyRecord(route);
      storedHiringGoal = {
        id: storedHiringGoal?.id || "goal-001",
        user_id: currentUser.id,
        month: String(body.month || currentMonthKey),
        hire_target: Number(body.hire_target ?? 10),
        candidates_target: Number(body.candidates_target ?? 50),
        interviews_target: Number(body.interviews_target ?? 20),
        offers_target: Number(body.offers_target ?? 8),
        created_at: storedHiringGoal?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await fulfillPostgrest(route, [storedHiringGoal], storedHiringGoal, 201);
    } else if (method === "PATCH") {
      const body = parseBodyRecord(route);
      storedHiringGoal = {
        ...(storedHiringGoal || mockHiringGoals),
        ...body,
        updated_at: new Date().toISOString(),
      } as MockHiringGoal;
      await fulfillPostgrest(route, [storedHiringGoal], storedHiringGoal);
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    }
  });

  // Offers & Candidate Offer Portal
  await page.route("**/rest/v1/job_offers*", async (route) => {
    await fulfillPostgrest(route, [mockOffer]);
  });

  await page.route("**/rest/v1/rpc/get_offer_by_token*", async (route) => {
    const postData = parseBodyRecord(route);
    if (postData._token === mockOffer.token) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockOffer]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
  });

  await page.route("**/rest/v1/rpc/respond_to_offer*", async (route) => {
    const postData = parseBodyRecord(route);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, status: postData._status }),
    });
  });

  // Assessments & Anti-Cheat Proctoring RPCs
  await page.route("**/rest/v1/assessments*", async (route) => {
    await fulfillPostgrest(route, [mockAssessment]);
  });

  await page.route("**/rest/v1/assessment_responses*", async (route) => {
    await fulfillPostgrest(route, mockAssessmentResponses);
  });

  await page.route("**/rest/v1/rpc/get_assessment_for_candidate*", async (route) => {
    const postData = parseBodyRecord(route);
    if (postData._token === mockAssessment.token) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          assessment: {
            title: mockAssessment.title,
            description: mockAssessment.description,
            duration_minutes: mockAssessment.duration_minutes,
            passing_score: mockAssessment.passing_score,
            question_count: mockAssessment.question_count,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ assessment: null }),
      });
    }
  });

  await page.route("**/rest/v1/rpc/begin_assessment_attempt*", async (route) => {
    const postData = parseBodyRecord(route);
    const trackingCode = String(postData._tracking_code || "").trim();
    if (!trackingCode || trackingCode === "INVALID") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid tracking code" }),
      });
      return;
    }

    const nowMs = Date.now();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        response_id: "resp-session-001",
        access_token: `access-${mockTrackingCode}`,
        expires_at: new Date(nowMs + mockAssessment.duration_minutes * 60_000).toISOString(),
        server_time: new Date(nowMs).toISOString(),
        questions: mockAssessment.questions,
        answers: [],
        revision: 1,
        status: "in_progress",
      }),
    });
  });

  await page.route("**/rest/v1/rpc/save_assessment_attempt*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ saved: true }),
    });
  });

  await page.route("**/rest/v1/rpc/finish_assessment_attempt*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "completed",
        total_score: 100,
        max_score: 100,
        percentage: 100,
        passed: true,
        timed_out: false,
      }),
    });
  });

  // Company Invitations & Onboarding Acceptance
  await page.route("**/rest/v1/company_invitations*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === "GET") {
      if (url.includes("token=eq.") && !url.includes(mockInvitation.token)) {
        await fulfillPostgrest(route, [], null);
        return;
      }
      await fulfillPostgrest(route, [mockInvitation], mockInvitation);
      return;
    }

    if (method === "POST") {
      const payload = parseBodyRecord(route);
      const created = { ...mockInvitation, ...payload, id: `inv-${Date.now()}` };
      await fulfillPostgrest(route, [created], created, 201);
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockInvitation]),
      });
    }
  });

  await page.route("**/rest/v1/rpc/accept_company_invitation*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, company_id: mockCompany.id }),
    });
  });

  await page.route("**/rest/v1/rpc/decline_company_invitation*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  // Auxiliary Tables & Public Settings
  await page.route("**/rest/v1/activity_logs*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/rest/v1/audit_logs*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/rest/v1/notifications*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/rest/v1/agency_cases*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/rest/v1/email_tracking*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.route("**/rest/v1/subscription_plans*", async (route) => {
    await fulfillPostgrest(route, mockSubscriptionPlans);
  });

  await page.route("**/rest/v1/company_subscriptions*", async (route) => {
    await fulfillPostgrest(route, [], null);
  });

  await page.route("**/rest/v1/platform_contact_settings*", async (route) => {
    const contactRow = {
      contact_email: "contact@tawzeefx.com",
      support_email: "support@tawzeefx.com",
      contact_phone: "+966500000000",
      location_ar: "الرياض، المملكة العربية السعودية",
      location_en: "Riyadh, Saudi Arabia",
      hours_ar: "الأحد - الخميس 9ص - 5م",
      hours_en: "Sun - Thu 9AM - 5PM",
    };
    await fulfillPostgrest(route, [contactRow], contactRow);
  });

  // Storage & Edge Functions
  await page.route("**/storage/v1/object/resumes/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ Key: "resumes/mock-resume.pdf" }),
    });
  });

  await page.route("**/functions/v1/execute-password-reset*", async (route) => {
    const body = parseBodyRecord(route);
    if (body.token === "valid-reset-token") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Token expired or invalid" }),
      });
    }
  });

  await page.route("**/functions/v1/evaluate-candidate*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        overallScore: 89,
        skillsScore: 92,
        experienceScore: 85,
        strengths: ["خبرة قوية في React", "إتقان TypeScript"],
        weaknesses: ["بحاجة لتعزيز مهارات GraphQL"],
        recommendation: "strongly_hire",
        summary: "مرشح متميز ذو كفاءة تقنية عالية",
      }),
    });
  });

  await page.route("**/functions/v1/auto-create-candidate-account*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "invited" }),
    });
  });

  await page.route("**/functions/v1/evaluate-assessment-answers*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "completed",
        total_score: 100,
        max_score: 100,
        percentage: 100,
        passed: true,
        timed_out: false,
      }),
    });
  });

  await page.route("**/functions/v1/send-email*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route("**/functions/v1/send-welcome-email*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}
