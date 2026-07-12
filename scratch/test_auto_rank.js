const SUPABASE_URL = "https://rlfewneisuezsamhosct.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDkwMjcsImV4cCI6MjA5NzE4NTAyN30.ksVJqWEBcbfRMfPpmf_J3DxnJpVnK4Tb6ouEI6d3sLo";
const userId = "8d580386-b774-45ef-9369-fc30c6892878";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";

async function loginAndRank() {
  const email = "ctraining801@gmail.com";
  const password = "TestPassword123!";
  
  console.log(`Logging in as ${email}...`);
  const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!loginResponse.ok) {
    console.error("Login failed:", await loginResponse.text());
    return;
  }
  
  const tokenData = await loginResponse.json();
  const accessToken = tokenData.access_token;
  console.log("Login successful!");

  // 1. Fetch first job for user
  console.log("Fetching jobs...");
  const jobsResponse = await fetch(`${SUPABASE_URL}/rest/v1/jobs?user_id=eq.${userId}&limit=1`, {
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${accessToken}`
    }
  });

  if (!jobsResponse.ok) {
    console.error("Failed to fetch jobs:", await jobsResponse.text());
    return;
  }

  const jobs = await jobsResponse.json();
  if (jobs.length === 0) {
    console.error("No jobs found for this user. Cannot test auto-rank.");
    return;
  }

  const jobId = jobs[0].id;
  console.log(`Using job: "${jobs[0].title}" (ID: ${jobId})`);

  // 2. Link candidates to this job
  console.log("Linking candidates to the job...");
  const linkResponse = await fetch(`${SUPABASE_URL}/rest/v1/candidates?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ job_id: jobId })
  });

  if (!linkResponse.ok) {
    console.error("Failed to link candidates:", await linkResponse.text());
    return;
  }
  console.log("Candidates linked successfully.");

  // 3. Trigger auto-rank Edge Function
  console.log("Invoking auto-rank Edge Function...");
  const rankResponse = await fetch(`${SUPABASE_URL}/functions/v1/auto-rank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "apikey": ANON_KEY
    },
    body: JSON.stringify({ jobId })
  });

  if (!rankResponse.ok) {
    console.error("Auto-rank failed:", await rankResponse.text());
    return;
  }

  const result = await rankResponse.json();
  console.log("Auto-rank finished. Result:", result);

  // 4. Fetch candidates back to see their score
  console.log("\nFetching ranked candidates...");
  const candResponse = await fetch(`${SUPABASE_URL}/rest/v1/candidates?job_id=eq.${jobId}&select=name,role,ai_score,ai_evaluation`, {
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${accessToken}`
    }
  });

  const rankedCandidates = await candResponse.json();
  console.log("\n--- RANKED CANDIDATES ---");
  rankedCandidates.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.name} (${c.role || "No Role"})`);
    console.log(`   AI Score: ${c.ai_score ?? "N/A"}%`);
    console.log(`   AI Evaluation:`, c.ai_evaluation ? JSON.parse(c.ai_evaluation) : "N/A");
    console.log("-----------------------------------------");
  });
}

loginAndRank().catch(console.error);
