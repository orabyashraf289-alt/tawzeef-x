import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignIn() {
  console.log("Attempting sign in for tx@tawzeefx.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "tx@tawzeefx.com",
    password: "Tx@2026!",
  });

  if (error) {
    console.error("Sign in failed:");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("Name:", error.name);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    
    // Check RPC call
    const { error: rpcError } = await supabase.rpc("get_user_role", { _user_id: "7e78c821-79e2-4a58-9e24-13fb6cecddba" });
    if (rpcError) {
       console.error("RPC get_user_role error:", rpcError);
    }
  } else {
    console.log("Sign in successful!");
    console.log("User:", data.user?.id);
    
    // Check RPC call
    const { data: roleData, error: roleError } = await supabase.rpc("get_user_role", { _user_id: data.user?.id });
    if (roleError) {
      console.error("Error fetching user role:", roleError);
    } else {
      console.log("User role:", roleData);
    }
  }
}

testSignIn();
