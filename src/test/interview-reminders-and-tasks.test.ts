import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import {
  constantTimeEqual,
  evaluateReminderWindow,
  formatInterviewLocalTime,
  getCandidateDateStrings,
  isReminderAuthorized,
  resolveInterviewTimeZone,
  zonedDateTimeToUtc,
} from "../../supabase/functions/_shared/interviewReminders";
import {
  downloadTaskIcs,
  escapeIcsText,
  foldIcsLine,
  formatIcsUtcDate,
  generateIcsCalendar,
  generateInterviewIcs,
  generateTaskIcs,
} from "@/lib/calendarIcs";
import type { TaskWorkspaceData, WorkflowTask } from "@/lib/taskWorkflow";

const {
  rpcMock,
  fromMock,
  insertMock,
  channelMock,
  onMock,
  subscribeMock,
  removeChannelMock,
  toastMock,
  channelObj,
} = vi.hoisted(() => {
  const subscribeFn = vi.fn();
  const onFn = vi.fn();
  const obj = {
    on: onFn,
    subscribe: subscribeFn,
  };
  const insertFn = vi.fn();

  return {
    rpcMock: vi.fn(),
    fromMock: vi.fn(),
    insertMock: insertFn,
    channelMock: vi.fn(),
    onMock: onFn,
    subscribeMock: subscribeFn,
    removeChannelMock: vi.fn(),
    toastMock: vi.fn(),
    channelObj: obj,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/AnimatedBackground", () => ({
  AnimatedDashboardBackground: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "user@example.com" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useJobs", () => ({
  useNotifications: () => ({
    data: [
      {
        id: "notif-1",
        user_id: "user-1",
        title: "تذكير مقابلة قادمة",
        description: "مقابلة خلال ساعة",
        type: "interview_reminder",
        read: false,
        created_at: new Date().toISOString(),
      },
    ],
    isLoading: false,
  }),
}));

import { TaskWorkspace } from "@/pages/TaskBoard";
import Notifications from "@/pages/Notifications";

function makeTask(index: number, overrides: Partial<WorkflowTask> = {}): WorkflowTask {
  return {
    id: `task-${index}`,
    title: `Task ${index}`,
    description: `Description ${index}`,
    expected_outcome: `Outcome ${index}`,
    user_id: "user-1",
    assignee_id: "user-1",
    assignee_name: "Team Member",
    reviewer_id: "reviewer-1",
    reviewer_name: "Reviewer One",
    due_date: `2026-12-${String((index % 28) + 1).padStart(2, "0")}`,
    priority: "medium",
    column_status: "todo",
    completion_note: "",
    blocked_reason: "",
    subtasks: [],
    version: 1,
    archived_at: null,
    completed_at: null,
    job_id: null,
    candidate_id: null,
    cycle_id: null,
    events: [],
    ...overrides,
  };
}

function makeWorkspaceData(tasks: WorkflowTask[]): TaskWorkspaceData {
  return {
    tasks,
    can_manage: true,
    members: [
      { id: "user-1", name: "Team Member" },
      { id: "reviewer-1", name: "Reviewer One" },
    ],
    jobs: [],
    candidates: [],
    cycles: [],
    legacy: [],
  };
}

function renderWithProviders(client: QueryClient, node: ReactNode) {
  return render(
    createElement(
      MemoryRouter,
      null,
      createElement(QueryClientProvider, { client }, node),
    ),
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  onMock.mockReturnValue(channelObj);
  subscribeMock.mockReturnValue(channelObj);
  channelMock.mockReturnValue(channelObj);
  insertMock.mockResolvedValue({ error: null });
  fromMock.mockImplementation(() => ({
    insert: insertMock,
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
      neq: vi.fn().mockResolvedValue({ error: null }),
    })),
  }));
});

describe("interview-reminders authorization security", () => {
  const cronSecret = "cron-secret-999";
  const serviceRoleKey = "service-role-secret-123";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-public-key";

  it("rejects anonKey in Authorization header (Bearer or raw) and rejects substring injection", () => {
    expect(
      isReminderAuthorized({
        authorizationHeader: `Bearer ${anonKey}`,
        cronSecretHeader: null,
        cronSecret,
        serviceRoleKey,
      }),
    ).toBe(false);

    expect(
      isReminderAuthorized({
        authorizationHeader: anonKey,
        cronSecretHeader: null,
        cronSecret,
        serviceRoleKey,
      }),
    ).toBe(false);

    expect(
      isReminderAuthorized({
        authorizationHeader: `Bearer ${anonKey} ${serviceRoleKey}`,
        cronSecretHeader: null,
        cronSecret,
        serviceRoleKey,
      }),
    ).toBe(false);

    expect(
      isReminderAuthorized({
        authorizationHeader: `Bearer prefix-${cronSecret}`,
        cronSecretHeader: null,
        cronSecret,
        serviceRoleKey,
      }),
    ).toBe(false);
  });

  it("fails closed when secrets are missing or empty", () => {
    expect(
      isReminderAuthorized({
        authorizationHeader: "Bearer ",
        cronSecretHeader: "",
        cronSecret: "",
        serviceRoleKey: "",
      }),
    ).toBe(false);

    expect(
      isReminderAuthorized({
        authorizationHeader: null,
        cronSecretHeader: null,
        cronSecret: undefined,
        serviceRoleKey: undefined,
      }),
    ).toBe(false);
  });

  it("accepts exact CRON_SECRET (Bearer or x-cron-secret) and exact SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(
      isReminderAuthorized({
        authorizationHeader: `Bearer ${cronSecret}`,
        cronSecretHeader: null,
        cronSecret,
        serviceRoleKey,
      }),
    ).toBe(true);

    expect(
      isReminderAuthorized({
        authorizationHeader: null,
        cronSecretHeader: cronSecret,
        cronSecret,
        serviceRoleKey,
      }),
    ).toBe(true);

    expect(
      isReminderAuthorized({
        authorizationHeader: `Bearer ${serviceRoleKey}`,
        cronSecretHeader: null,
        cronSecret,
        serviceRoleKey,
      }),
    ).toBe(true);

    expect(constantTimeEqual("abc123", "abc123")).toBe(true);
    expect(constantTimeEqual("abc123", "abc124")).toBe(false);
    expect(constantTimeEqual("abc123", "abc1234")).toBe(false);
  });
});

describe("interview-reminders timezone window calculation", () => {
  it("converts Asia/Riyadh (+03:00) interviews cleanly across UTC midnight", () => {
    const utc = zonedDateTimeToUtc("2026-11-06", "00:30", "Asia/Riyadh");
    expect(utc?.toISOString()).toBe("2026-11-05T21:30:00.000Z");

    const evaluation = evaluateReminderWindow(
      { date: "2026-11-06", time: "00:30:00", time_zone: "Asia/Riyadh" },
      { now: new Date("2026-11-05T20:30:00.000Z") },
    );
    expect(evaluation.eligible).toBe(true);
    expect(evaluation.minutesUntil).toBe(60);
    expect(evaluation.timeZone).toBe("Asia/Riyadh");
    expect(formatInterviewLocalTime(evaluation.startsAtUtc!, evaluation.timeZone)).toBe("00:30");
  });

  it("handles Africa/Cairo standard (+02:00) vs summer DST (+03:00) and negative UTC offsets", () => {
    const winterCairo = zonedDateTimeToUtc("2026-11-15", "14:00", "Africa/Cairo");
    expect(winterCairo?.toISOString()).toBe("2026-11-15T12:00:00.000Z");

    const summerCairo = zonedDateTimeToUtc("2026-07-15", "14:00", "Africa/Cairo");
    expect(summerCairo?.toISOString()).toBe("2026-07-15T11:00:00.000Z");

    const nyUtc = zonedDateTimeToUtc("2026-11-05", "22:30", "America/New_York");
    expect(nyUtc?.toISOString()).toBe("2026-11-06T03:30:00.000Z");
  });

  it("enforces strict (30, 90] minute window boundaries and supports starts_at", () => {
    const interview = { date: "2026-11-10", time: "10:00", time_zone: "Asia/Riyadh" }; // 07:00Z
    expect(
      evaluateReminderWindow(interview, { now: new Date("2026-11-10T06:30:00.000Z") }).eligible,
    ).toBe(false);
    expect(
      evaluateReminderWindow(interview, { now: new Date("2026-11-10T06:29:30.000Z") }).eligible,
    ).toBe(true);
    expect(
      evaluateReminderWindow(interview, { now: new Date("2026-11-10T05:30:00.000Z") }).eligible,
    ).toBe(true);
    expect(
      evaluateReminderWindow(interview, { now: new Date("2026-11-10T05:29:30.000Z") }).eligible,
    ).toBe(false);

    const withStartsAt = evaluateReminderWindow(
      {
        date: "2026-11-10",
        time: "10:00",
        time_zone: "Asia/Riyadh",
        starts_at: "2026-11-10T08:00:00.000Z",
      },
      { now: new Date("2026-11-10T07:00:00.000Z") },
    );
    expect(withStartsAt.eligible).toBe(true);
    expect(withStartsAt.minutesUntil).toBe(60);

    expect(
      evaluateReminderWindow(
        { date: "2026-02-30", time: "10:00", time_zone: "Asia/Riyadh" },
        { now: new Date("2026-02-28T07:00:00.000Z") },
      ).reason,
    ).toBe("invalid_time");
  });

  it("resolves timezone from interview, company brand_settings/country, or Asia/Riyadh default", () => {
    expect(resolveInterviewTimeZone({ time_zone: "Asia/Cairo" })).toBe("Africa/Cairo");
    expect(
      resolveInterviewTimeZone(
        { time_zone: null },
        { brand_settings: { time_zone: "Africa/Cairo" } },
      ),
    ).toBe("Africa/Cairo");
    expect(resolveInterviewTimeZone({ time_zone: null }, { country: "Egypt" })).toBe(
      "Africa/Cairo",
    );
    expect(resolveInterviewTimeZone({ time_zone: null }, null)).toBe("Asia/Riyadh");
    expect(getCandidateDateStrings(new Date("2026-11-05T23:30:00Z"))).toEqual([
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
  });
});

describe("RFC 5545 .ics calendar generation", () => {
  it("formats UTC dates, escapes TEXT characters, and folds >75 octet lines cleanly", () => {
    expect(formatIcsUtcDate(new Date("2026-11-05T21:30:05.000Z"))).toBe("20261105T213005Z");
    expect(escapeIcsText("Review; Plan, Item\\1\nNext line")).toBe(
      "Review\\; Plan\\, Item\\\\1\\nNext line",
    );

    const longArabicLine = `DESCRIPTION:${"مهمة ".repeat(30)}`;
    const folded = foldIcsLine(longArabicLine);
    const segments = folded.split("\r\n ");
    expect(segments.length).toBeGreaterThan(1);
    const encoder = new TextEncoder();
    for (let i = 0; i < segments.length; i += 1) {
      const octets = encoder.encode(i === 0 ? segments[i] : ` ${segments[i]}`).length;
      expect(octets).toBeLessThanOrEqual(75);
    }
    expect(segments.join("")).toBe(longArabicLine);
  });

  it("generates standards-compliant VCALENDAR/VEVENT for tasks and interviews", () => {
    const taskIcs = generateTaskIcs({
      id: "task-123",
      title: "Approve offer; notify, candidate",
      dueDate: "2026-11-15",
      expectedOutcome: "Signed offer\nUploaded PDF",
      assigneeName: "Sara",
      timeZone: "Asia/Riyadh",
      createdAt: new Date("2026-11-01T10:00:00Z"),
    });

    expect(taskIcs).toContain("\r\n");
    const lines = taskIcs.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("CALSCALE:GREGORIAN");
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("UID:task-task-123@tawzeef-x.com");
    expect(lines).toContain("DTSTAMP:20261101T100000Z");
    expect(lines).toContain("DTSTART:20261115T060000Z");
    expect(lines).toContain("DTEND:20261115T070000Z");
    expect(lines).toContain("SUMMARY:Approve offer\\; notify\\, candidate");
    expect(lines).toContain("STATUS:CONFIRMED");
    expect(lines[lines.length - 1]).toBe("END:VCALENDAR");

    const interviewIcs = generateInterviewIcs({
      id: "int-42",
      candidateName: "Omar",
      position: "Backend Engineer",
      date: "2026-11-05",
      time: "23:45:00",
      timeZone: "Africa/Cairo",
      durationMinutes: 45,
      meetingUrl: "https://meet.jit.si/room-42",
      createdAt: new Date("2026-11-01T10:00:00Z"),
    });
    expect(interviewIcs).toContain("DTSTART:20261105T214500Z");
    expect(interviewIcs).toContain("DTEND:20261105T223000Z");
    expect(interviewIcs).toContain("URL:https://meet.jit.si/room-42");

    expect(() => generateIcsCalendar([])).toThrow();
  });

  it("downloads an .ics file via Blob and anchor element", () => {
    const createObjectUrl = vi.fn(() => "blob:mock-ics-url");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: revokeObjectUrl,
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadTaskIcs({
      id: "task-dl",
      title: "Calendar Export",
      dueDate: "2026-11-20",
    });

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:mock-ics-url");
    clickSpy.mockRestore();
  });
});

describe("TaskWorkspace & Notifications Phase 2 upgrades", () => {
  it("subscribes to company_tasks Realtime and cleans up on unmount", async () => {
    rpcMock.mockResolvedValue({ data: makeWorkspaceData([makeTask(1)]), error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { unmount } = renderWithProviders(
      client,
      createElement(TaskWorkspace, {
        companyId: "company-1",
        userId: "user-1",
        ar: false,
      }),
    );

    await screen.findByRole("button", { name: /Task 1/ });
    expect(channelMock).toHaveBeenCalledWith("company_tasks:company-1");
    expect(onMock).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "tasks",
        filter: "company_id=eq.company-1",
      }),
      expect.any(Function),
    );
    expect(subscribeMock).toHaveBeenCalled();

    unmount();
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it("shows loaded limit reached indicator at 500 tasks and supports load more pagination", async () => {
    const fiveHundredTasks = Array.from({ length: 500 }, (_, i) => makeTask(i + 1));
    rpcMock.mockImplementation(
      (_name, args: { _action: string; _payload?: Record<string, unknown> }) => {
        if (args._action === "list" && args._payload && "offset" in args._payload) {
          return Promise.resolve({
            data: makeWorkspaceData([
              makeTask(501, { title: "Task 1000 Loaded", due_date: "2026-12-01" }),
            ]),
            error: null,
          });
        }
        return Promise.resolve({ data: makeWorkspaceData(fiveHundredTasks), error: null });
      },
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderWithProviders(
      client,
      createElement(TaskWorkspace, {
        companyId: "company-1",
        userId: "user-1",
        ar: false,
      }),
    );

    expect(await screen.findByText(/Loaded limit reached \(500 tasks\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Load more tasks"));
    expect(screen.getByText(/Showing 100 of 500 loaded tasks/)).toBeInTheDocument();

    // Narrow filter so client slice is satisfied, then Load more requests the next server page
    fireEvent.change(screen.getByLabelText("Search tasks"), { target: { value: "Task 10" } });
    fireEvent.click(screen.getByText("Load more tasks"));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("task_workflow", {
        _company_id: "company-1",
        _action: "list",
        _payload: { archived: false, offset: 500, limit: 500 },
      });
    });
  });

  it("exports .ics from task details and keeps task saves fail-safe when notification insert fails", async () => {
    rpcMock.mockImplementation((_name, args: { _action: string }) => {
      if (args._action === "create") {
        return Promise.resolve({ data: { id: "task-new" }, error: null });
      }
      return Promise.resolve({ data: makeWorkspaceData([makeTask(1)]), error: null });
    });

    const createObjectUrl = vi.fn(() => "blob:mock-task-ics");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: revokeObjectUrl });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    renderWithProviders(
      client,
      createElement(TaskWorkspace, {
        companyId: "company-1",
        userId: "user-1",
        ar: false,
      }),
    );

    fireEvent.click(await screen.findByRole("button", { name: /Task 1/ }));
    const icsBtn = await screen.findByRole("button", { name: "Add to Calendar (.ics)" });
    fireEvent.click(icsBtn);
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:mock-task-ics");
    clickSpy.mockRestore();

    fireEvent.keyDown(document.activeElement || document.body, { key: "Escape" });

    insertMock.mockResolvedValueOnce({ error: { message: "RLS denied" } });
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    fireEvent.change(screen.getByLabelText("Task title"), {
      target: { value: "Notify assignee task" },
    });
    fireEvent.change(screen.getByLabelText("Expected outcome and acceptance criteria"), {
      target: { value: "Notification attempted safely" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith("notifications");
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          type: "task",
        }),
      );
      expect(toastMock).toHaveBeenCalledWith({ title: "Change saved" });
    });
  });

  it("subscribes to notifications Realtime in Notifications page and removes channel on unmount", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { unmount } = renderWithProviders(
      client,
      createElement(Notifications),
    );

    expect(channelMock).toHaveBeenCalledWith("notifications-live:user-1");
    expect(onMock).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "notifications",
        filter: "user_id=eq.user-1",
      }),
      expect.any(Function),
    );
    expect(subscribeMock).toHaveBeenCalled();

    unmount();
    expect(removeChannelMock).toHaveBeenCalled();
  });
});
