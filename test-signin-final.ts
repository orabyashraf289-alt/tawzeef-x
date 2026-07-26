import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignInFinal() {
  console.log("Attempting sign in for tx@tawzeefx.com with Password123!...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "tx@tawzeefx.com",
    password: "Password123!",
  });

  if (error) {
    console.error("Sign in failed:");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("Full error:", JSON.stringify(error, null, 2));
  } else {
    console.log("SUCCESS! LOGIN PASSED PERFECTLY!");
    console.log("User ID:", data.user?.id);
    console.log("User Email:", data.user?.email);
  }
}

testSignInFinal();
