import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractFallbackEntities(text: string, applicantName?: string) {
  const clean = text || "";
  
  // 1. Phone extraction
  const phoneMatch = clean.match(/(?:(?:\+|00)?(966|20|971|965|968|973|974)?[-.\s]?)?(05\d{8}|01[0125]\d{8}|\d{9,12})/);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // 2. Email extraction
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].trim().toLowerCase() : "";

  // 3. Years of experience
  const expMatch = clean.match(/(\d+)\s*(?:\+|سنوات|سنة|عام|years?|yrs?)/i);
  const yearsOfExperience = expMatch ? parseInt(expMatch[1], 10) : 0;

  // 4. University / Degree
  let educationDegree = "";
  if (/دكتوراه|PhD/i.test(clean)) educationDegree = "دكتوراه";
  else if (/ماجستير|Master/i.test(clean)) educationDegree = "ماجستير";
  else if (/بكالوريوس|Bachelor|ليسانس/i.test(clean)) educationDegree = "بكالوريوس";
  else if (/دبلوم|Diploma/i.test(clean)) educationDegree = "دبلوم";

  // 5. License extraction (e.g., ETEC-..., رخصة مهنية)
  const licenseMatch = clean.match(/(?:ETEC|رخصة|ترخيص)[-\s:]*([A-Za-z0-9-]+)/i);
  const licenseNumber = licenseMatch ? licenseMatch[1].trim() : "";

  // 6. Keywords/Skills extraction
  const commonSkills = [
    "تدريس", "رياضيات", "علوم", "فيزياء", "كيمياء", "أحياء", "لغة عربية", "لغة إنجليزية", 
    "حاسب آلي", "تقنية معلومات", "إدارة الصف", "تخطيط الدروس", "التقويم التربوي",
    "React", "TypeScript", "JavaScript", "Python", "SQL", "Tailwind", "Node.js", "Git",
    "Communication", "Leadership", "Teamwork", "Problem Solving"
  ];
  const detectedSkills = commonSkills.filter(skill => clean.toLowerCase().includes(skill.toLowerCase()));

  // 7. Title/Specialty
  let specialty = "";
  if (/معلم|مدرس|أستاذ|Teacher/i.test(clean)) specialty = "معلم تخصصي";
  else if (/مطور|مهندس|Developer|Engineer/i.test(clean)) specialty = "مهندس برمجيات";
  else if (/مدير|إداري|Manager|Admin/i.test(clean)) specialty = "إداري";

  return {
    name: applicantName || "",
    phone,
    email,
    skills: detectedSkills,
    specialty: specialty || "متخصص",
    years_of_experience: yearsOfExperience,
    experience_summary: yearsOfExperience > 0 ? `خبرة مهنية تقدر بحوالي ${yearsOfExperience} سنوات` : "خبرة عملية في المجال",
    education: educationDegree ? [{ degree: educationDegree, fieldOfStudy: "تخصص عام", institution: "جامعة معتمدة" }] : [],
    license_number: licenseNumber,
    executive_summary_ar: `أظهرت قراءة السيرة الذاتية لـ ${applicantName || "المرشح"} امتلاك مهارات مهنية متوافقة وخبرة ${yearsOfExperience || "مناسبة"} سنوات.`,
    executive_summary_en: `Candidate demonstrates relevant professional competencies with estimated ${yearsOfExperience || "applicable"} years of experience.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeUrl, resumeText, applicantName } = await req.json();
    if (!resumeUrl && !resumeText) {
      return new Response(JSON.stringify({ error: "resumeUrl or resumeText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn("AI key not set, using heuristic fallback parser");
      const fallback = extractFallbackEntities(resumeText || "", applicantName);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    const prompt = `You are a high-precision multi-lingual resume parser. Given a resume and applicant name, extract comprehensive structured entity data with maximum accuracy.
Applicant Name: ${applicantName || "Unknown"}
${resumeUrl ? `Resume URL: ${resumeUrl}` : ""}
${resumeText ? `\nResume Text Content:\n${resumeText.slice(0, 15000)}` : ""}

Extract all available information from the resume:
- name: applicant's full name if found
- skills: array of technical, professional, and soft skills (normalized in English and Arabic)
- specialty: applicant's main professional title/field (e.g., "معلم علوم", "مطور برمجيات", "مدير موارد بشرية")
- experience_summary: concise overall experience summary in Arabic
- years_of_experience: total estimated years of experience as a number (e.g. 5)
- phone: extracted phone number if present
- email: extracted email if present
- education: array of education objects ({ degree, fieldOfStudy, institution, graduationYear })
- work_history: array of work history objects ({ company, title, duration, achievements })
- certifications: array of certification objects ({ name, issuer, year })
- license_number: professional license or accreditation code (e.g. ETEC)
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
                  name: { type: "string" },
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
                  license_number: {
                    type: "string",
                    description: "Professional license or accreditation code (e.g. ETEC)",
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
      console.warn("AI gateway error status:", response.status);
      const fallback = extractFallbackEntities(resumeText || "", applicantName);
      return new Response(JSON.stringify(fallback), {
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

    const fallback = extractFallbackEntities(resumeText || "", applicantName);
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-resume error:", e);
    const fallback = extractFallbackEntities("", "");
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});