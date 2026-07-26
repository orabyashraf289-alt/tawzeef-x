import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignInCtraining() {
  console.log("Attempting sign in for ctraining801@gmail.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "ctraining801@gmail.com",
    password: "Tx@2026!",
  });

  if (error) {
    console.error("Sign in failed:");
    console.error(error.message);
  } else {
    console.log("Sign in successful!");
    console.log("User ID:", data.user?.id);
  }
}

testSignInCtraining();
