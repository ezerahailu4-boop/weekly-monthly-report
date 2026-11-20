import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

function getSeedPassword(envName) {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    return { password: fromEnv, source: "env" };
  }
  const generated = crypto.randomBytes(16).toString("base64url") + "!9A";
  return { password: generated, source: "generated" };
}

async function upsertUser(email, envVarName, fullName, department, role) {
  const existing = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;`;

  if (existing.length === 0) {
    const { password, source } = getSeedPassword(envVarName);
    const hash = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (${email.toLowerCase()}, ${hash}, ${fullName}, ${department}, ${role});
    `;
    console.log(`[SEED] Created account: ${email}`);
    console.log(`[CREDENTIAL - ONE-TIME DISPLAY] Password (${source}): ${password}`);
  } else if (process.env[envVarName]?.trim()) {
    const hash = await bcrypt.hash(process.env[envVarName].trim(), 10);
    await sql`
      UPDATE users
      SET password_hash = ${hash},
          full_name = ${fullName},
          department = ${department},
          role = ${role}
      WHERE id = ${existing[0].id};
    `;
    console.log(`[UPDATE] Updated password from ${envVarName}: ${email}`);
  } else {
    await sql`
      UPDATE users
      SET full_name = ${fullName},
          department = ${department},
          role = ${role}
      WHERE id = ${existing[0].id};
    `;
    console.log(`[VERIFIED] Account verified: ${email} (password preserved)`);
  }
}

async function main() {
  console.log("Renaming holding to YETAF HOLDING and provisioning accounts...");

  // 1. Provision official YETAF HOLDING accounts
  await upsertUser(
    "ceo@yetaf-holding.com",
    "CEO_SEED_PASSWORD",
    "Executive Chairman & Direction",
    "Office of the Direction & Board",
    "super_admin"
  );

  await upsertUser(
    "admin@yetaf-holding.com",
    "ADMIN_SEED_PASSWORD",
    "Executive Administrator",
    "Executive Management",
    "admin"
  );

  await upsertUser(
    "operations@yetaf-holding.com",
    "STAFF_SEED_PASSWORD",
    "Abebe Tadesse (Ops Lead)",
    "Operations & Logistics",
    "employee"
  );

  // 2. Also keep backwards-compatible aliases so previous logins also work
  await upsertUser(
    "ceo@yetta-holding.com",
    "CEO_SEED_PASSWORD",
    "Executive Chairman & Direction",
    "Office of the Direction & Board",
    "super_admin"
  );

  await upsertUser(
    "admin@yetta-holding.com",
    "ADMIN_SEED_PASSWORD",
    "Executive Administrator",
    "Executive Management",
    "admin"
  );

  await upsertUser(
    "operations@yetta-holding.com",
    "STAFF_SEED_PASSWORD",
    "Abebe Tadesse (Ops Lead)",
    "Operations & Logistics",
    "employee"
  );

  console.log("All YETAF HOLDING accounts provisioned successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

