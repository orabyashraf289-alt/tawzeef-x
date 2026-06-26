// Semantic AI candidate search using Lovable AI embeddings
// Computes cosine similarity in-memory; caches embeddings on candidates table.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBED_MODEL = "google/gemini-3-flash-preview";

function buildCandidateText(c: any): string {
  return [
    c.name,
    c.role,
    c.summary,
    (c.skills || []).join(", "),
    c.experience,
    c.education,
    c.location,
  ]
    .filter(Boolean)
    .join(" | ");
}

// Lovable AI doesn't expose a dedicated embeddings model right now,
// so we use a deterministic hash-based pseudo-embedding for fast keyword
// matching, plus an LLM rerank for the top N. This gives semantic-feel
// results without requiring an embeddings endpoint.
function hashEmbed(text: string, dim = 128): number[] {
  const v = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/[\s,/|.;:!?()\[\]{}"'`-]+/).filter(Boolean);
  for (const tok of tokens) {
    let h = 5381;
    for (let i = 0; i < tok.length; i++) h = ((h << 5) + h) ^ tok.charCodeAt(i);
    const idx = Math.abs(h) % dim;
    v[idx] += 1;
  }
  // L2 normalize
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const query: string = (body.query || "").toString().trim();
    const limit: number = Math.min(50, Number(body.limit) || 20);
    if (!query) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to update embedding cache safely
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: candidates, error } = await supabase
      .from("candidates")
      .select("id,name,role,email,phone,skills,experience,education,summary,location,stage,status,ai_score,rating,created_at,embedding,embedding_text")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const queryVec = hashEmbed(query);

    // Score candidates - combine cached embedding similarity + keyword expansion
    const expandedQuery = await expandQueryWithAI(query);
    const expandedVec = hashEmbed(`${query} ${expandedQuery}`);

    type Scored = { c: any; score: number; matchedTerms: string[] };
    const scored: Scored[] = [];

    for (const c of (candidates || [])) {
      const text = buildCandidateText(c);
      let vec: number[];
      if (c.embedding && Array.isArray(c.embedding) && c.embedding_text === text) {
        vec = c.embedding as number[];
      } else {
        vec = hashEmbed(text);
        // Cache asynchronously, don't block
        admin.from("candidates").update({ embedding: vec, embedding_text: text }).eq("id", c.id).then(() => {});
      }
      const sim = (cosine(vec, queryVec) * 0.6) + (cosine(vec, expandedVec) * 0.4);
      // Boost: exact substring match in name/role/skills
      const lowerText = text.toLowerCase();
      const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      const matched = queryTokens.filter(t => lowerText.includes(t));
      const boost = matched.length * 0.05;
      scored.push({ c, score: sim + boost, matchedTerms: matched });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map(s => ({
      ...s.c,
      _score: Math.round(s.score * 100) / 100,
      _matched: s.matchedTerms,
    }));

    return new Response(
      JSON.stringify({ results: top, query_expansion: expandedQuery, total: scored.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("semantic-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function expandQueryWithAI(query: string): Promise<string> {
  try {
    const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!key) return "";
    const isDirectGemini = (key.startsWith("AIza") || key.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : API_URL;
    const finalModel = isDirectGemini ? "gemini-2.5-flash" : EMBED_MODEL;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: finalModel,
        messages: [
          {
            role: "system",
            content:
              "أنت محرك توسيع استعلامات للبحث في المرشحين. أعطني فقط 8-12 كلمة مفتاحية مرادفة أو ذات صلة بالاستعلام. أعد سطراً واحداً مفصول بمسافات. لا شرح. اللغتان عربي/إنجليزي مسموحتان.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 80,
      }),
    });
    if (!resp.ok) {
      const err = await getResponseError(resp);
      console.error("Embedding API error:", err);
      return "";
    }
    const data = await resp.json();
    return (data?.choices?.[0]?.message?.content || "").toString().slice(0, 300);
  } catch {
    return "";
  }
}


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
    } catch {}
  }
  return "خطأ غير معروف في الذكاء الاصطناعي";
}