// Safely extract a human-readable message from a caught value without
// resorting to `any`. `catch` clauses receive `unknown` by default in
// strict TS, and most of our error paths only ever need `.message`.
export function getErrorMessage(error: unknown, fallback = "حدث خطأ غير متوقع"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
}
