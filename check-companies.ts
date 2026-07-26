import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rlfewneisuezsamhosct.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDkwMjcsImV4cCI6MjA5NzE4NTAyN30.ksVJqWEBcbfRMfPpmf_J3DxnJpVnK4Tb6ouEI6d3sLo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCompaniesAndProfiles() {
  console.log("Signing in as tx@tawzeefx.com...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "tx@tawzeefx.com",
    password: "Password123!",
  });

  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  console.log("Authenticated! User ID:", authData.user?.id);

  console.log("\nFetching companies...");
  const { data: companies, error: compErr } = await supabase.from('companies').select('*');
  if (compErr) console.error("Companies Error:", compErr);
  else console.log("Companies count:", companies?.length, JSON.stringify(companies, null, 2));

  console.log("\nFetching profiles...");
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) console.error("Profiles Error:", profErr);
  else console.log("Profiles count:", profiles?.length, JSON.stringify(profiles, null, 2));

  console.log("\nFetching company_members...");
  const { data: members, error: memErr } = await supabase.from('company_members').select('*');
  if (memErr) console.error("Members Error:", memErr);
  else console.log("Members count:", members?.length, JSON.stringify(members, null, 2));
}

checkCompaniesAndProfiles();
