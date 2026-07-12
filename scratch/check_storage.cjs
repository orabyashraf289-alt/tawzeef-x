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

async function testQuery() {
  // Let's try running a simple SELECT query on profiles
  const { data: prof, error: profErr } = await supabase.from("profiles").select("user_id").limit(1);
  console.log("Profiles query result:", profErr ? profErr.message : "success", prof);

  // Let's try to query public.users table if it exists
  const { data: usr, error: usrErr } = await supabase.from("users").select("*").limit(1);
  console.log("Users query result:", usrErr ? usrErr.message : "success", usr);
}

testQuery();
