/**
 * Sanitizes and cleans AI assistant messages by removing internal chain-of-thought
 * tags (<thinking>, <tool_code>, <tool_call>), raw Python code leaks, and formatting artifacts.
 */
export function cleanAIMessageContent(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove complete and unclosed <thinking> tags
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  cleaned = cleaned.replace(/<thinking>[\s\S]*/gi, "");

  // 2. Remove complete and unclosed <tool_code> tags
  cleaned = cleaned.replace(/<tool_code>[\s\S]*?<\/tool_code>/gi, "");
  cleaned = cleaned.replace(/<tool_code>[\s\S]*/gi, "");

  // 3. Remove complete and unclosed <tool_call> tags
  cleaned = cleaned.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "");
  cleaned = cleaned.replace(/<tool_call>[\s\S]*/gi, "");

  // 4. Remove raw Python function calls leaking into text (e.g. print(generate_job_description(...)))
  cleaned = cleaned.replace(/print\s*\(\s*generate_\w+\s*\([\s\S]*?\)\s*\)/gi, "");
  cleaned = cleaned.replace(/generate_job_description\s*\([\s\S]*?\)/gi, "");

  // 5. Remove any standalone XML tags leaking internal AI reasoning
  cleaned = cleaned.replace(/<\/?(?:thought|thinking|tool_code|tool_call|code_interpreter)[^>]*>/gi, "");

  // 6. Clean up repeated newlines & whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}
