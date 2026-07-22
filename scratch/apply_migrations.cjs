const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir);

const versions = [];
const targetVersion = '20260718002000'; // The one we want to apply now

for (const file of files) {
  if (file.endsWith('.sql')) {
    const match = file.match(/^(\d+)_/);
    if (match) {
      const version = match[1];
      if (version < targetVersion) {
        versions.push(version);
      }
    }
  }
}

console.log(`Found ${versions.length} migrations prior to ${targetVersion}.`);
console.log("Repairing migration history on the remote database...");

// Chunk versions to avoid command line length limits
const chunkSize = 20;
for (let i = 0; i < versions.length; i += chunkSize) {
  const chunk = versions.slice(i, i + chunkSize);
  const cmd = `npx supabase migration repair ${chunk.join(' ')} --status applied --linked --yes`;
  console.log(`Running chunk ${i / chunkSize + 1}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Failed to repair chunk: ${err.message}`);
    process.exit(1);
  }
}

console.log("All prior migrations marked as applied. Now pushing new migrations...");
try {
  execSync("npx supabase db push", { stdio: 'inherit' });
  console.log("Database push completed successfully!");
} catch (err) {
  console.error(`Database push failed: ${err.message}`);
  process.exit(1);
}
