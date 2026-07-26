import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdmin() {
  console.log("Attempting sign up for tx@tawzeefx.com...");
  const { data, error } = await supabase.auth.signUp({
    email: "tx@tawzeefx.com",
    password: "Tx@2026!",
  });

  if (error) {
    console.error("Sign up failed:");
    console.error(error.message);
  } else {
    console.log("Sign up successful!");
    console.log("User ID:", data.user?.id);
  }
}

createAdmin();
