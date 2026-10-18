export type ApplicantAccountResult = "invited" | "existing" | "not_found";

type AdminClient = {
  from: (table: "applications") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { name: string } | null; error: { message: string } | null }>;
        };
      };
    };
  };
  rpc: (name: string, args: { email_input: string }) => Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>;
  auth: {
    admin: {
      inviteUserByEmail: (email: string, options: { redirectTo: string; data: { full_name: string; account_type: string } }) =>
        Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function provisionApplicantAccount(
  admin: AdminClient,
  email: string,
  trackingCode: string,
): Promise<ApplicantAccountResult> {
  const { data: application, error: applicationError } = await admin.from("applications")
    .select("name")
    .eq("tracking_code", trackingCode)
    .eq("email", email)
    .maybeSingle();
  if (applicationError) throw applicationError;
  if (!application) return "not_found";

  // The lookup is granted only to service_role. Never replace an existing
  // password or silently change an existing account's authorization role.
  const { data: users, error: lookupError } = await admin.rpc("get_user_by_email_v1", { email_input: email });
  if (lookupError) throw lookupError;
  if (users?.length) return "existing";

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://www.tawzeefx.com/reset-password?invite=applicant",
    data: { full_name: application.name, account_type: "job_seeker" },
  });
  if (inviteError) {
    // Another submission can create the user between our lookup and invite.
    if (/already (registered|exists)|already been registered/i.test(inviteError.message)) return "existing";
    throw inviteError;
  }
  return "invited";
}
