import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignInNewUser() {
  console.log("Attempting sign in for test_user_2026@tawzeefx.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "test_user_2026@tawzeefx.com",
    password: "Password123!",
  });

  if (error) {
    console.error("Sign in failed:");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("Name:", error.name);
    console.error("Full error object:", JSON.stringify(error, null, 2));
  } else {
    console.log("Sign in successful!");
    console.log("User:", data.user?.id);
  }
}

testSignInNewUser();
