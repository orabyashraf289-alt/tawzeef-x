const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const targetTables = [
  "audit_log",
  "question_bank",
  "talent_pool",
  "pipeline_stages",
  "pipeline_sub_stages"
];

async function run() {
  for (const table of targetTables) {
    // We insert a dummy row, select it, then delete it.
    // For some tables like pipeline_stages or pipeline_sub_stages, there might be required columns.
    // Let's just try to insert with a random uuid or name if it fails, or inspect the error message!
    // The error message itself will tell us if company_id is a valid column!
    // E.g., if we try to insert { company_id: 'd337a426-cfc1-4919-992a-a6f672ec755a' } and it says "column company_id does not exist", then it doesn't exist.
    // If it says "foreign key constraint violation", then it DOES exist!
    console.log(`Checking table ${table}...`);
    const { error } = await supabase.from(table).insert({ company_id: "f06dacc5-bdb4-4389-9163-a9e64b301db9" });
    if (error) {
      if (error.message.includes("column \"company_id\" does not exist")) {
        console.log(`Table ${table}: MISSING company_id`);
      } else {
        console.log(`Table ${table}: HAS company_id (Failed with: ${error.message})`);
      }
    } else {
      console.log(`Table ${table}: HAS company_id (Insert succeeded)`);
      // Clean up the dummy insert
      await supabase.from(table).delete().eq("company_id", "f06dacc5-bdb4-4389-9163-a9e64b301db9");
    }
  }
}
run();
