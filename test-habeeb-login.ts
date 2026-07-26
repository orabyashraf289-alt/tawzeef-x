import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rlfewneisuezsamhosct.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDkwMjcsImV4cCI6MjA5NzE4NTAyN30.ksVJqWEBcbfRMfPpmf_J3DxnJpVnK4Tb6ouEI6d3sLo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testHabeebLogin() {
  console.log("Testing signin for habeeb@tawzeefx.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "habeeb@tawzeefx.com",
    password: "Habeeb@2026!",
  });

  if (error) {
    console.error("Sign in failed:", error.message);
  } else {
    console.log("SUCCESS! LOGIN PASSED FOR HABEEB COMPANY OWNER!");
    console.log("User ID:", data.user?.id);
    console.log("User Email:", data.user?.email);
  }
}

testHabeebLogin();
