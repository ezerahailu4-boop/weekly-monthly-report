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

async function main() {
  console.log("Migrating database for Direction (Super Admin) and Review workflow...");

  // 1. Update users role check constraint to support super_admin
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`;
  await sql`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('employee', 'admin', 'super_admin'));
  `;
  console.log("Updated users_role_check to include 'super_admin'.");

  // 2. Add review metadata columns to reports table
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_notes TEXT;`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;`;
  console.log("Added review_notes, reviewed_by, and reviewed_at columns to reports.");

  // 3. Seed Direction (Super Admin) account
  const ceoEmail = "ceo@yetaf-holding.com";
  const existingCeo = await sql`SELECT id FROM users WHERE email = ${ceoEmail};`;

  if (existingCeo.length === 0) {
    const { password: ceoPassword, source } = getSeedPassword("CEO_SEED_PASSWORD");
    const ceoHash = await bcrypt.hash(ceoPassword, 10);
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (
        ${ceoEmail},
        ${ceoHash},
        'Executive Chairman & Direction',
        'Office of the Direction & Board',
        'super_admin'
      );
    `;
    console.log(`[SEED] Created Direction: ${ceoEmail}`);
    console.log(`[CREDENTIAL - ONE-TIME DISPLAY] Direction Password (${source}): ${ceoPassword}`);
  } else if (process.env.CEO_SEED_PASSWORD?.trim()) {
    const ceoHash = await bcrypt.hash(process.env.CEO_SEED_PASSWORD.trim(), 10);
    await sql`
      UPDATE users
      SET role = 'super_admin',
          password_hash = ${ceoHash},
          full_name = 'Executive Chairman & Direction',
          department = 'Office of the Direction & Board'
      WHERE email = ${ceoEmail};
    `;
    console.log(`[UPDATE] Updated Direction password from CEO_SEED_PASSWORD: ${ceoEmail}`);
  } else {
    await sql`
      UPDATE users
      SET role = 'super_admin',
          full_name = 'Executive Chairman & Direction',
          department = 'Office of the Direction & Board'
      WHERE email = ${ceoEmail};
    `;
    console.log(`[VERIFIED] Direction account verified: ${ceoEmail} (password preserved)`);
  }

  // 4. Ensure standard Admin account is also set
  const adminEmail = "admin@yetaf-holding.com";
  const existingAdmin = await sql`SELECT id FROM users WHERE email = ${adminEmail};`;

  if (existingAdmin.length === 0) {
    const { password: adminPassword, source } = getSeedPassword("ADMIN_SEED_PASSWORD");
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (
        ${adminEmail},
        ${adminHash},
        'Executive Administrator',
        'Executive Management',
        'admin'
      );
    `;
    console.log(`[SEED] Created Admin: ${adminEmail}`);
    console.log(`[CREDENTIAL - ONE-TIME DISPLAY] Admin Password (${source}): ${adminPassword}`);
  } else if (process.env.ADMIN_SEED_PASSWORD?.trim()) {
    const adminHash = await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD.trim(), 10);
    await sql`
      UPDATE users
      SET role = 'admin',
          password_hash = ${adminHash},
          full_name = 'Executive Administrator',
          department = 'Executive Management'
      WHERE email = ${adminEmail};
    `;
    console.log(`[UPDATE] Updated Admin password from ADMIN_SEED_PASSWORD: ${adminEmail}`);
  } else {
    await sql`
      UPDATE users
      SET role = 'admin',
          full_name = 'Executive Administrator',
          department = 'Executive Management'
      WHERE email = ${adminEmail};
    `;
    console.log(`[VERIFIED] Admin account verified: ${adminEmail} (password preserved)`);
  }

  // 5. Seed sample Department Employee account
  const staffEmail = "operations@yetaf-holding.com";
  const existingStaff = await sql`SELECT id FROM users WHERE email = ${staffEmail};`;

  if (existingStaff.length === 0) {
    const { password: staffPassword, source } = getSeedPassword("STAFF_SEED_PASSWORD");
    const staffHash = await bcrypt.hash(staffPassword, 10);
    await sql`
      INSERT INTO users (email, password_hash, full_name, department, role)
      VALUES (
        ${staffEmail},
        ${staffHash},
        'Abebe Tadesse (Ops Lead)',
        'Operations & Logistics',
        'employee'
      );
    `;
    console.log(`[SEED] Created Staff Member: ${staffEmail}`);
    console.log(`[CREDENTIAL - ONE-TIME DISPLAY] Staff Password (${source}): ${staffPassword}`);
  } else if (process.env.STAFF_SEED_PASSWORD?.trim()) {
    const staffHash = await bcrypt.hash(process.env.STAFF_SEED_PASSWORD.trim(), 10);
    await sql`
      UPDATE users
      SET role = 'employee',
          password_hash = ${staffHash},
          full_name = 'Abebe Tadesse (Ops Lead)',
          department = 'Operations & Logistics'
      WHERE email = ${staffEmail};
    `;
    console.log(`[UPDATE] Updated Staff password from STAFF_SEED_PASSWORD: ${staffEmail}`);
  } else {
    await sql`
      UPDATE users
      SET role = 'employee',
          full_name = 'Abebe Tadesse (Ops Lead)',
          department = 'Operations & Logistics'
      WHERE email = ${staffEmail};
    `;
    console.log(`[VERIFIED] Staff account verified: ${staffEmail} (password preserved)`);
  }

  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

