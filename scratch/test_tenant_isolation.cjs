const { createClient } = require('@supabase/supabase-js');

// We use the anon key to simulate an authenticated user session
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDkwMjcsImV4cCI6MjA5NzE4NTAyN30.ksVJqWEBcbfRMfPpmf_J3DxnJpVnK4Tb6ouEI6d3sLo";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

async function run() {
  const supabase = createClient(supabaseUrl, anonKey);

  // Authenticate as Ashraf Mahmoud Oraby (Tawzeef-X owner/admin)
  // user_id: 8d580386-b774-45ef-9369-fc30c6892878
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "ctraining801@gmail.com", // Wait, let's check his email from the user_details
    password: "TestPassword123!" // If this is his email
  });

  if (authErr) {
    console.error("Auth failed:", authErr.message);
    return;
  }

  console.log("Logged in successfully as:", authData.user.email);

  // Let's select jobs
  const { data: jobs, error: jobsErr } = await supabase.from("jobs").select("id, title, company_id");
  if (jobsErr) {
    console.error("Jobs fetch error:", jobsErr.message);
  } else {
    console.log(`Fetched ${jobs.length} jobs:`, jobs);
  }

  // Let's select candidates
  const { data: candidates, error: candErr } = await supabase.from("candidates").select("id, name, company_id");
  if (candErr) {
    console.error("Candidates fetch error:", candErr.message);
  } else {
    console.log(`Fetched ${candidates.length} candidates:`, candidates);
  }
}
run();
