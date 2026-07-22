const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: companies, error } = await supabase.from("companies").select("*").limit(1);
  if (error) {
    console.error("companies error:", error.message);
  } else {
    console.log("companies columns:", Object.keys(companies[0] || {}));
  }

  const { data: jobs, error: jobsErr } = await supabase.from("jobs").select("*").limit(1);
  if (jobsErr) {
    console.error("jobs error:", jobsErr.message);
  } else {
    console.log("jobs columns:", Object.keys(jobs[0] || {}));
  }
}
run();
