import { Page } from "@playwright/test";
import {
  mockUser,
  mockCompany,
  mockJob,
  mockCandidate,
  mockIneligibleCandidate,
  mockPipelineStages,
  mockOffer,
  mockAssessment,
  mockInvitation,
} from "./mockData";

export async function setupSupabaseMocks(page: Page, options?: { role?: string; user?: any }) {
  const currentUser = options?.user || {
    ...mockUser,
    role: options?.role || mockUser.role,
  };

  // Intercept Auth Session
  await page.route("**/auth/v1/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-jwt-token-12345",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: currentUser,
      }),
    });
  });

  await page.route("**/auth/v1/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentUser),
    });
  });

  // Intercept Password Login
  await page.route("**/auth/v1/token?grant_type=password*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-jwt-token-12345",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: currentUser,
      }),
    });
  });

  // Intercept Logout
  await page.route("**/auth/v1/logout*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // Intercept User Roles
  await page.route("**/rest/v1/user_roles*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "role-001",
            user_id: currentUser.id,
            role: currentUser.role,
            company_id: mockCompany.id,
            created_at: "2026-01-01T00:00:00Z",
          },
        ]),
      });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    }
  });

  // Intercept Profiles
  await page.route("**/rest/v1/profiles*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || "مستخدم النظام",
          role: currentUser.role,
          created_at: "2026-01-01T00:00:00Z",
        },
      ]),
    });
  });

  // Intercept Companies
  await page.route("**/rest/v1/companies*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([mockCompany]),
    });
  });

  // Intercept Jobs
  await page.route("**/rest/v1/jobs*", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      const created = {
        ...mockJob,
        ...payload,
        id: `job-${Date.now()}`,
      };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([created]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockJob]),
      });
    }
  });

  // Intercept Candidates
  await page.route("**/rest/v1/candidates*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockCandidate, mockIneligibleCandidate]),
      });
    } else if (route.request().method() === "PATCH") {
      const patchData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ ...mockCandidate, ...patchData }]),
      });
    } else if (route.request().method() === "POST") {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([{ id: `cand-${Date.now()}`, ...postData }]),
      });
    }
  });

  // Intercept Pipeline Stages
  await page.route("**/rest/v1/pipeline_stages*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockPipelineStages),
    });
  });

  // Intercept Offers RPC & REST
  await page.route("**/rest/v1/job_offers*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([mockOffer]),
    });
  });

  await page.route("**/rest/v1/rpc/get_offer_by_token*", async (route) => {
    const postData = route.request().postDataJSON();
    if (postData?._token === mockOffer.token) {
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
    const postData = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, status: postData?._status }),
    });
  });

  // Intercept Assessment RPCs
  await page.route("**/rest/v1/rpc/get_assessment_by_token*", async (route) => {
    const postData = route.request().postDataJSON();
    if (postData?._token === mockAssessment.token) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          assessment: {
            id: mockAssessment.id,
            title: mockAssessment.title,
            description: mockAssessment.description,
            duration_minutes: mockAssessment.duration_minutes,
            passing_score: mockAssessment.passing_score,
            is_randomized: mockAssessment.is_randomized,
          },
          questions: mockAssessment.questions,
        }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Assessment not found" }),
      });
    }
  });

  await page.route("**/rest/v1/rpc/start_assessment_session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response_id: "resp-session-001" }),
    });
  });

  await page.route("**/rest/v1/rpc/submit_assessment*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total_score: 100,
        max_score: 100,
        percentage: 100,
        passed: true,
      }),
    });
  });

  // Intercept Company Invitations
  await page.route("**/rest/v1/company_invitations*", async (route) => {
    if (route.request().url().includes(mockInvitation.token)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockInvitation),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockInvitation]),
      });
    }
  });

  // Intercept Stage Transitions & Stage History
  await page.route("**/rest/v1/stage_transitions*", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route("**/rest/v1/stage_history*", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  // Intercept Edge Functions
  await page.route("**/functions/v1/execute-password-reset*", async (route) => {
    const body = route.request().postDataJSON();
    if (body?.token === "valid-reset-token") {
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
}
