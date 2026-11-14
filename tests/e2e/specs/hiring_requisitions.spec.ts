import { test, expect, Page } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockCompany, mockHiringGoals, mockReviewerUser, mockUser } from "../fixtures/mockData";

async function mockRequisitionsEndpoints(page: Page) {
  await page.route("**/rest/v1/company_departments*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "dept-1",
          company_id: mockCompany.id,
          name: "الهندسة التقنية",
          branch_name: "الرياض",
          cost_center: "ENG-101",
          manager_user_id: mockUser.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route("**/rest/v1/job_requisitions*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "req-1",
          company_id: mockCompany.id,
          department_id: "dept-1",
          branch_name: "الرياض",
          title: "مهندس برمجيات أول",
          employment_type: "full_time",
          headcount_requested: 2,
          headcount_filled: 1,
          budget_min: 15000,
          budget_max: 20000,
          currency: "SAR",
          priority: "high",
          target_start_date: null,
          justification: "توسعة فريق المنصة",
          requirements: "React, TypeScript",
          status: "approved",
          requested_by: mockUser.id,
          approved_by: mockUser.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
          linked_job_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route("**/rest/v1/requisition_approvals*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

test.describe("Hiring Plan & Manpower Requisitions Flow — /hiring-plan", () => {
  test("should render manpower requisitions workspace on /hiring-plan by default", async ({ page }) => {
    await setupSupabaseMocks(page, { user: mockUser, role: "admin" });
    await mockRequisitionsEndpoints(page);
    await seedAuthSession(page, mockUser);

    await page.goto("/hiring-plan");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("tab", { name: /الاحتياج الوظيفي وطلبات التوظيف/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByText("مهندس برمجيات أول")).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole("button", { name: /الإدارات والفروع/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /طلب احتياج جديد/i })).toBeVisible();
  });

  test("should render monthly hiring targets, funnel metrics and PDF export for authorized admin/recruiter", async ({ page }) => {
    await setupSupabaseMocks(page, { user: mockUser, role: "admin" });
    await mockRequisitionsEndpoints(page);
    await seedAuthSession(page, mockUser);

    await page.goto("/hiring-plan?tab=goals");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /خطة التوظيف الشهرية/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByText("التخطيط الاستراتيجي ومستهدفات التوظيف").first()).toBeVisible();

    // Target KPI cards
    await expect(page.getByText("المرشحون المستهدفون")).toBeVisible();
    await expect(page.getByText("المقابلات المستهدفة")).toBeVisible();
    await expect(page.getByText("العروض المستهدفة")).toBeVisible();
    await expect(page.getByText("التوظيف المستهدف")).toBeVisible();

    // Funnel & export action
    await expect(page.getByText(/قمع التوظيف/)).toBeVisible();
    await expect(page.getByRole("button", { name: /تصدير PDF/i })).toBeVisible();
  });

  test("should allow editing and persisting monthly hiring targets via Supabase API", async ({ page }) => {
    await setupSupabaseMocks(page, { user: mockUser, role: "admin", hiringGoal: mockHiringGoals });
    await mockRequisitionsEndpoints(page);
    await seedAuthSession(page, mockUser);

    await page.goto("/hiring-plan");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("tab", { name: /خطة التوظيف الشهرية/i }).click();

    const editBtn = page.getByRole("button", { name: /تعديل الأهداف/i });
    await expect(editBtn).toBeVisible({ timeout: 6000 });
    await editBtn.click();

    const targetInputs = page.locator("input[type='number']");
    await expect(targetInputs).toHaveCount(4);

    // Update candidates target (first input) and hire target (fourth input)
    await targetInputs.nth(0).fill("75");
    await targetInputs.nth(3).fill("12");

    const patchPromise = page.waitForRequest(
      (req) => req.url().includes("/rest/v1/hiring_goals") && req.method() === "PATCH"
    );

    const saveBtn = page.getByRole("button", { name: /حفظ الأهداف/i });
    await saveBtn.click();

    const patchRequest = await patchPromise;
    expect(patchRequest.postDataJSON()).toMatchObject({
      candidates_target: 75,
      hire_target: 12,
    });

    await expect(page.getByText(/تم حفظ أهداف التوظيف/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should insert a new monthly hiring goal record when none exists yet", async ({ page }) => {
    await setupSupabaseMocks(page, { user: mockUser, role: "recruiter", hiringGoal: null });
    await mockRequisitionsEndpoints(page);
    await seedAuthSession(page, mockUser);

    await page.goto("/hiring-plan?tab=goals");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /تعديل الأهداف/i }).click();
    const targetInputs = page.locator("input[type='number']");
    await targetInputs.nth(0).fill("40");

    const insertPromise = page.waitForRequest(
      (req) => req.url().includes("/rest/v1/hiring_goals") && req.method() === "POST"
    );
    await page.getByRole("button", { name: /حفظ الأهداف/i }).click();

    const postRequest = await insertPromise;
    expect(postRequest.postDataJSON()).toMatchObject({
      candidates_target: 40,
      user_id: mockUser.id,
    });
  });

  test("should block reviewer role from accessing /hiring-plan via RoleProtectedRoute", async ({ page }) => {
    await setupSupabaseMocks(page, {
      user: mockReviewerUser,
      role: "reviewer",
      isSuperAdmin: false,
    });
    await mockRequisitionsEndpoints(page);
    await seedAuthSession(page, mockReviewerUser);

    await page.goto("/hiring-plan");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "403" })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole("heading", { name: /ليس لديك صلاحية|Access Denied/i })).toBeVisible();
  });
});
