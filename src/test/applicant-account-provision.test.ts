import { describe, expect, it, vi } from "vitest";
import { provisionApplicantAccount } from "../../supabase/functions/auto-create-candidate-account/provision";

function makeAdmin(application: { name: string } | null, users: Array<{ id: string }> = []) {
  const inviteUserByEmail = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: application, error: null });
  const emailEq = vi.fn(() => ({ maybeSingle }));
  const trackingEq = vi.fn(() => ({ eq: emailEq }));
  const rpc = vi.fn().mockResolvedValue({ data: users, error: null });
  const admin = {
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: trackingEq })) })),
    rpc,
    auth: { admin: { inviteUserByEmail } },
  };
  return { admin, trackingEq, emailEq, rpc, inviteUserByEmail };
}

describe("applicant account provisioning", () => {
  const email = "applicant@example.com";
  const code = "TX-" + "A".repeat(32);

  it("requires the matching application and invites the job seeker to set a private password", async () => {
    const { admin, trackingEq, emailEq, inviteUserByEmail } = makeAdmin({ name: "سارة أحمد" });
    expect(await provisionApplicantAccount(admin, email, code)).toBe("invited");
    expect(trackingEq).toHaveBeenCalledWith("tracking_code", code);
    expect(emailEq).toHaveBeenCalledWith("email", email);
    expect(inviteUserByEmail).toHaveBeenCalledWith(email, {
      redirectTo: "https://www.tawzeefx.com/reset-password?invite=applicant",
      data: { full_name: "سارة أحمد", account_type: "job_seeker" },
    });
    expect(inviteUserByEmail.mock.calls[0][1]).not.toHaveProperty("password");
  });

  it("does not create an account without a matching application", async () => {
    const { admin, rpc, inviteUserByEmail } = makeAdmin(null);
    expect(await provisionApplicantAccount(admin, email, code)).toBe("not_found");
    expect(rpc).not.toHaveBeenCalled();
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("preserves an existing user and never sends an invitation that could alter its credentials", async () => {
    const { admin, inviteUserByEmail } = makeAdmin({ name: "سارة أحمد" }, [{ id: "existing-user" }]);
    expect(await provisionApplicantAccount(admin, email, code)).toBe("existing");
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });
});
