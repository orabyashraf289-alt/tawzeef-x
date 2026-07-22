const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("=== USERS ===");
  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) console.error("Error listing users:", usersErr);
  else {
    users.users.forEach(u => {
      console.log(`User ID: ${u.id}, Email: ${u.email}, Metadata:`, JSON.stringify(u.user_metadata));
    });
  }

  console.log("\n=== PROFILES ===");
  const { data: profiles, error: profsErr } = await supabase.from("profiles").select("*");
  if (profsErr) console.error("Error profiles:", profsErr);
  else console.log(profiles);

  console.log("\n=== COMPANY MEMBERS ===");
  const { data: members, error: memErr } = await supabase.from("company_members").select("*");
  if (memErr) console.error("Error members:", memErr);
  else console.log(members);

  console.log("\n=== COMPANIES ===");
  const { data: companies, error: compsErr } = await supabase.from("companies").select("*");
  if (compsErr) console.error("Error companies:", compsErr);
  else console.log(companies);
}

run();
