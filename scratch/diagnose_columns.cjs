const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const tables = [
  "jobs",
  "candidates",
  "applications",
  "interviews",
  "job_offers",
  "assessments",
  "company_subscriptions",
  "audit_log",
  "question_bank",
  "talent_pool",
  "pipeline_stages",
  "pipeline_sub_stages"
];

async function run() {
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message);
    } else {
      const cols = data.length > 0 ? Object.keys(data[0]) : [];
      console.log(`Table ${table} columns:`, cols.includes("company_id") ? "HAS company_id" : "MISSING company_id", "(total cols:", cols.length, ")");
    }
  }
}
run();
