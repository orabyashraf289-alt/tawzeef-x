const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

if (fs.existsSync(".env")) {
  const content = fs.readFileSync(".env", "utf8");
  content.split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  const { data: avatarsData, error: avatarsErr } = await supabase.storage.getBucket("avatars");
  console.log("avatars bucket:", avatarsErr ? avatarsErr.message : "found");
  
  const { data: resumesData, error: resumesErr } = await supabase.storage.getBucket("resumes");
  console.log("resumes bucket:", resumesErr ? resumesErr.message : "found");
}

testStorage();
