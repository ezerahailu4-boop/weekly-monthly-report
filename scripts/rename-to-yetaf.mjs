import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

async function upsertUser(email, rawPassword, fullName, department, role) {
  const hash = await bcrypt.hash(rawPassword, 10);
  const existing = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;`;

  if (existing.length === 0) {
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (${email.toLowerCase()}, ${hash}, ${fullName}, ${department}, ${role});
    `;
    console.log(`Created account: ${email}`);
  } else {
    await sql`
      UPDATE users
      SET password_hash = ${hash},
          full_name = ${fullName},
          department = ${department},
          role = ${role}
      WHERE id = ${existing[0].id};
    `;
    console.log(`Updated account: ${email}`);
  }
}

async function main() {
  console.log("Renaming holding to YETAF HOLDING and provisioning accounts...");

  // 1. Provision official YETAF HOLDING accounts
  await upsertUser(
    "ceo@yetaf-holding.com",
    "YetafCeo2026!",
    "Executive Chairman & CEO",
    "Office of the CEO & Board",
    "super_admin"
  );

  await upsertUser(
    "admin@yetaf-holding.com",
    "YetafAdmin2026!",
    "Executive Administrator",
    "Executive Management",
    "admin"
  );

  await upsertUser(
    "operations@yetaf-holding.com",
    "YetafStaff2026!",
    "Abebe Tadesse (Ops Lead)",
    "Operations & Logistics",
    "employee"
  );

  // 2. Also keep backwards-compatible aliases so previous logins also work
  await upsertUser(
    "ceo@yetta-holding.com",
    "YetafCeo2026!",
    "Executive Chairman & CEO",
    "Office of the CEO & Board",
    "super_admin"
  );

  await upsertUser(
    "admin@yetta-holding.com",
    "YetafAdmin2026!",
    "Executive Administrator",
    "Executive Management",
    "admin"
  );

  await upsertUser(
    "operations@yetta-holding.com",
    "YetafStaff2026!",
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

