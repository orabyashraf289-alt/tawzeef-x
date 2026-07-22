const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: cols, error } = await supabase.rpc("exec_sql", {
    sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pipeline_stages'"
  });
  if (error) {
    console.error("Error columns pipeline_stages:", error);
  } else {
    console.log("Columns of pipeline_stages:", cols);
  }

  const { data: cols2, error: error2 } = await supabase.rpc("exec_sql", {
    sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pipeline_sub_stages'"
  });
  if (error2) {
    console.error("Error columns pipeline_sub_stages:", error2);
  } else {
    console.log("Columns of pipeline_sub_stages:", cols2);
  }
}
run();
