import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeUrl, applicantName } = await req.json();
    if (!resumeUrl) {
      return new Response(JSON.stringify({ error: "resumeUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY or LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    const prompt = `You are a high-precision multi-lingual resume parser. Given a resume URL and applicant name, extract comprehensive structured entity data with maximum accuracy.
Resume URL: ${resumeUrl}
Applicant Name: ${applicantName || "Unknown"}

Extract all available information from the resume text:
- skills: array of technical, professional, and soft skills (normalized in English and Arabic)
- specialty: applicant's main professional title/field (e.g., "مطور برمجيات كامل", "مدير توظيف الموارد البشرية", "محلل بيانات")
- experience_summary: concise overall experience summary
- years_of_experience: total estimated years of experience as a number (e.g. 5)
- phone: extracted phone number if present
- email: extracted email if present
- education: array of education objects ({ degree, fieldOfStudy, institution, graduationYear })
- work_history: array of work history objects ({ company, title, duration, achievements })
- certifications: array of certification objects ({ name, issuer, year })
- executive_summary_ar: detailed executive evaluation summary in Arabic
- executive_summary_en: detailed executive evaluation summary in English

Return ONLY valid JSON using the function call extract_resume_data.`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isDirectGemini ? "gemini-2.0-flash" : "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: "You are a professional HR AI parsing engine. Always extract structured data with maximum precision into valid JSON tool calls." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_resume_data",
              description: "Extract high precision structured resume data",
              parameters: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of technical, soft, and domain skills",
                  },
                  specialty: {
                    type: "string",
                    description: "Main professional specialty or current title",
                  },
                  experience_summary: {
                    type: "string",
                    description: "Summary of overall work experience",
                  },
                  years_of_experience: {
                    type: "number",
                    description: "Total estimated years of experience",
                  },
                  phone: {
                    type: "string",
                    description: "Contact phone number",
                  },
                  email: {
                    type: "string",
                    description: "Contact email address",
                  },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        degree: { type: "string" },
                        fieldOfStudy: { type: "string" },
                        institution: { type: "string" },
                        graduationYear: { type: "string" },
                      },
                    },
                    description: "Educational history",
                  },
                  work_history: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company: { type: "string" },
                        title: { type: "string" },
                        duration: { type: "string" },
                        achievements: { type: "string" },
                      },
                    },
                    description: "Past employment history",
                  },
                  certifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        issuer: { type: "string" },
                        year: { type: "string" },
                      },
                    },
                    description: "Certifications and licenses",
                  },
                  executive_summary_ar: {
                    type: "string",
                    description: "Arabic executive summary of candidate fit",
                  },
                  executive_summary_en: {
                    type: "string",
                    description: "English executive summary of candidate fit",
                  },
                },
                required: ["skills", "specialty", "experience_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_resume_data" } },
      }),
    });

    if (!response.ok) {
      const err = await getResponseError(response);
      console.error("AI gateway error:", response.status, err);
      
      return new Response(JSON.stringify({ skills: [], specialty: "", experience_summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ skills: [], specialty: "", experience_summary: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    return new Response(JSON.stringify({ skills: [], specialty: "", experience_summary: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getResponseError(response: Response): Promise<string> {
  try {
    const json = await response.clone().json();
    if (json && json.error) {
      if (typeof json.error === "string") return json.error;
      if (json.error.message) return json.error.message;
      return JSON.stringify(json.error);
    }
  } catch {
    try {
      const text = await response.clone().text();
      if (text) return text.slice(0, 200);
    } catch (err) {
      console.warn("Failed to parse response text:", err);
    }
  }
  return "خطأ غير معروف في الذكاء الاصطناعي";
}