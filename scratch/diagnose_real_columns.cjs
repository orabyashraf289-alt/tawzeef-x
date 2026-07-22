const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data, error } = await supabase
    .from("columns")
    .select("table_name, column_name")
    .eq("table_schema", "public");

  if (error) {
    console.error("Error querying columns:", error.message);
  } else {
    const tableCols = {};
    for (const row of data) {
      if (!tableCols[row.table_name]) {
        tableCols[row.table_name] = [];
      }
      tableCols[row.table_name].push(row.column_name);
    }
    
    const targetTables = [
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

    for (const table of targetTables) {
      const cols = tableCols[table] || [];
      console.log(`Table ${table}:`, cols.includes("company_id") ? "HAS company_id" : "MISSING company_id", `(columns: ${cols.join(', ') || 'NONE'})`);
    }
  }
}
run();
