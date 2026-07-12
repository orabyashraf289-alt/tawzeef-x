const SUPABASE_URL = "https://rlfewneisuezsamhosct.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDkwMjcsImV4cCI6MjA5NzE4NTAyN30.ksVJqWEBcbfRMfPpmf_J3DxnJpVnK4Tb6ouEI6d3sLo";

async function loginAndSearch() {
  const email = "ctraining801@gmail.com";
  const password = "TestPassword123!";
  
  console.log(`Logging in as ${email}...`);
  
  try {
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!loginResponse.ok) {
      const err = await loginResponse.text();
      console.error("Login failed:", err);
      return;
    }
    
    const tokenData = await loginResponse.json();
    const accessToken = tokenData.access_token;
    console.log("Login successful! Access token obtained.");
    
    const query = "React Developer with experience in state management and typescript";
    console.log(`\nRunning semantic matching query: "${query}"...`);
    
    const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search-candidates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": ANON_KEY
      },
      body: JSON.stringify({ query, limit: 5 })
    });
    
    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error("Error from Edge Function:", errText);
      return;
    }
    
    const data = await searchResponse.json();
    console.log("\n--- SEMANTIC SEARCH MATCH RESULTS ---");
    console.log(`Query Expansion: "${data.query_expansion}"`);
    console.log(`Total Candidates Evaluated: ${data.total}\n`);
    
    if (data.results && data.results.length > 0) {
      data.results.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.name} (${c.role || "No Role"})`);
        console.log(`   Score: ${Math.round(c._score * 100)}% Match`);
        console.log(`   Location: ${c.location || "N/A"} | Exp: ${c.experience || "N/A"}`);
        console.log(`   Matched Keywords: ${c._matched ? c._matched.join(", ") : "None"}`);
        console.log(`   Skills: ${c.skills ? c.skills.slice(0, 5).join(", ") : "None"}`);
        console.log(`   -------------------------------------------------`);
      });
    } else {
      console.log("No candidates found in database.");
    }
  } catch (err) {
    console.error("Error during execution:", err);
  }
}

loginAndSearch();
