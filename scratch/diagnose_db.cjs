const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("=== ALL USERS IN DB ===");
  const { data: users, error: usersErr } = await supabase.from("profiles").select("user_id, full_name, role");
  if (usersErr) console.error("Users error:", usersErr.message);
  else console.log(JSON.stringify(users, null, 2));

  console.log("=== CANDIDATES IN DB ===");
  const { data: candidates, error: candErr } = await supabase.from("candidates").select("id, name, company_id, user_id");
  if (candErr) console.error("Candidates error:", candErr.message);
  else console.log(JSON.stringify(candidates, null, 2));
}

run().catch(console.error);
