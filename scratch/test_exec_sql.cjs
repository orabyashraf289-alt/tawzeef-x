const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("Checking if exec_sql RPC is available...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: "SELECT 1" });
  if (error) {
    console.log("exec_sql failed:", error.message);
  } else {
    console.log("exec_sql returned:", data);
  }

  console.log("Checking if execute_sql RPC is available...");
  const { data: data2, error: error2 } = await supabase.rpc("execute_sql", { sql: "SELECT 1" });
  if (error2) {
    console.log("execute_sql failed:", error2.message);
  } else {
    console.log("execute_sql returned:", data2);
  }
}

run().catch(console.error);
