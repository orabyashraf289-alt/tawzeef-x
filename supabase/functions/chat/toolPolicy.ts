// The model may read records and prepare drafts. Changes to hiring records and
// outbound messages must go through the application's review forms.
const sharedTools = [
  "search_candidates", "list_jobs", "get_stats", "analyze_resume_text",
  "generate_job_description", "generate_interview_questions",
  "get_proactive_insights", "generate_voice_briefing",
  "generate_whatsapp_sms_template",
] as const;

export const reviewerTools: ReadonlySet<string> = new Set(sharedTools);
export const staffTools: ReadonlySet<string> = new Set([...sharedTools, "create_job"]);

export function allowedChatTools<T extends { function: { name: string } }>(
  definitions: T[], role: "staff" | "reviewer",
): T[] {
  const permitted = role === "staff" ? staffTools : reviewerTools;
  return definitions.filter(tool => permitted.has(tool.function.name));
}
