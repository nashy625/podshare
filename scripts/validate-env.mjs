import fs from "node:fs";
import path from "node:path";

const root = "/Users/nashy/PodShare";

const checks = [
  {
    name: "backend",
    file: path.join(root, "apps/backend/.env"),
    required: [
      "DATABASE_URL",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "JWT_SECRET",
      "ENCRYPTION_KEY",
      "APP_URL",
    ],
    optional: [
      "STRIPE_PUBLISHABLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "SENDGRID_API_KEY",
    ],
  },
  {
    name: "frontend",
    file: path.join(root, "apps/frontend/.env"),
    required: [
      "VITE_API_URL",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
    ],
    optional: ["VITE_STRIPE_PUBLISHABLE_KEY"],
  },
];

function parseEnv(content) {
  const values = new Map();
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    values.set(key, value);
  }
  return values;
}

let hasError = false;

for (const check of checks) {
  console.log(`\n[${check.name}] ${check.file}`);

  if (!fs.existsSync(check.file)) {
    console.log("  Missing file");
    hasError = true;
    continue;
  }

  const env = parseEnv(fs.readFileSync(check.file, "utf8"));

  for (const key of check.required) {
    const value = env.get(key);
    const missing = !value || value.includes("placeholder") || value.includes("REPLACE_ME") || value.includes("[PROJECT-REF]");
    console.log(`  ${missing ? "MISSING" : "OK"} ${key}`);
    if (missing) {
      hasError = true;
    }
  }

  for (const key of check.optional ?? []) {
    const value = env.get(key);
    const missing = !value || value.includes("placeholder") || value.includes("REPLACE_ME") || value.includes("[PROJECT-REF]");
    console.log(`  ${missing ? "OPTIONAL" : "OK"} ${key}`);
  }
}

if (hasError) {
  console.log("\nEnvironment validation failed.");
  process.exit(1);
}

console.log("\nEnvironment validation passed.");
