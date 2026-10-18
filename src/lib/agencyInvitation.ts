export type AgencyInvitation = { name: string; email: string; invitationLink: string | null; isRenewal?: boolean };

export async function agencyFunctionError(error: unknown, data?: { error?: string } | null): Promise<Error> {
  let message = data?.error;
  const context = (error as { context?: Response } | null)?.context;
  if (!message && context && typeof context.clone === "function") {
    try {
      const response = await context.clone().json();
      message = response?.error;
    } catch { /* Keep the original error below. */ }
  }
  if (message === "Office email already exists; activate the existing office") {
    message = "هذا البريد يخص مكتبًا موجودًا. فعّل دخول المكتب من بطاقته في القائمة.";
  }
  return new Error(message || (error as Error | null)?.message || "تعذر تجهيز حساب المكتب");
}
