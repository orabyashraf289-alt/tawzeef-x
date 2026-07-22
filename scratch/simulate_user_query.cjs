const { createClient } = require('@supabase/supabase-js');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYwOTAyNywiZXhwIjoyMDk3MTg1MDI3fQ.VMyBoWVMRc6OzF1xU-RFzEJMSdBQlu2ttJBIX26HbeM";
const supabaseUrl = "https://rlfewneisuezsamhosct.supabase.co";

// Admin client to generate session
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const userId = "e6a3f7e3-edc3-46ed-8622-52c6c746be49";
  console.log("Generating login link/OTP for user...");
  const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'ashraf.orabi1996@gmail.com'
  });

  if (linkErr) {
    console.error("Error generating link:", linkErr);
    return;
  }

  const emailOtp = linkData.properties.email_otp;
  console.log(`Generated OTP: ${emailOtp}`);

  // Create a clean client for public user
  // Let's find the anon key in index.html or packages?
  // We can also just use the publishable key from .env:
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDkwMjcsImV4cCI6MjA5NzE4NTAyN30.ksVJqWEBcbfRMfPpmf_J3DxnJpVnK4Tb6ouEI6d3sLo";
  const userSupabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log("Signing in with OTP...");
  const { data: sessionData, error: sessionErr } = await userSupabase.auth.verifyOtp({
    email: 'ashraf.orabi1996@gmail.com',
    token: emailOtp,
    type: 'magiclink'
  });

  if (sessionErr) {
    console.error("Error signing in:", sessionErr);
    return;
  }

  console.log("Signed in successfully as user ID:", sessionData.user.id);
  console.log("Auth session access token:", sessionData.session.access_token);

  // Now query exactly like DashboardLayout.tsx
  console.log("\n--- Querying profiles ---");
  const { data: profile, error: profileErr } = await userSupabase
    .from("profiles")
    .select("full_name, avatar_url, job_title")
    .eq("user_id", sessionData.user.id)
    .maybeSingle();

  if (profileErr) console.error("Error profile:", profileErr);
  else console.log("Profile:", profile);

  console.log("\n--- Querying company_members ---");
  const { data: memberRows, error: memberErr } = await userSupabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", sessionData.user.id)
    .order("joined_at", { ascending: true });

  if (memberErr) console.error("Error company_members:", memberErr);
  else console.log("Company members:", memberRows);

  if (memberRows && memberRows.length > 0) {
    console.log("\n--- Querying companies ---");
    const { data: company, error: companyErr } = await userSupabase
      .from("companies")
      .select("name, logo_url")
      .eq("id", memberRows[0].company_id)
      .maybeSingle();

    if (companyErr) console.error("Error company:", companyErr);
    else console.log("Company:", company);
  }
}

run().catch(console.error);
