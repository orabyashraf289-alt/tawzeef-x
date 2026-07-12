const { createClient } = require("@supabase/supabase-js");

// Load variables from .env
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

if (fs.existsSync(".env")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env"));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorage() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error.message);
    return;
  }
  console.log("Buckets found:", buckets);

  for (const b of buckets) {
    const { data: files, error: filesErr } = await supabase.storage.from(b.id).list();
    if (filesErr) {
      console.log(`Error listing files in bucket ${b.id}:`, filesErr.message);
    } else {
      console.log(`Bucket ${b.id} has ${files.length} items at root.`);
    }
  }
}

checkStorage();
