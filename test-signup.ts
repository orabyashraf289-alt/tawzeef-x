import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignUp() {
  console.log("Attempting sign up for test_user_2026@tawzeefx.com...");
  const { data, error } = await supabase.auth.signUp({
    email: "test_user_2026@tawzeefx.com",
    password: "Password123!",
  });

  if (error) {
    console.error("Sign up failed:");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("Name:", error.name);
    console.error("Full error object:", JSON.stringify(error, null, 2));
  } else {
    console.log("Sign up successful!");
    console.log("User ID:", data.user?.id);
  }
}

testSignUp();
