import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { getDatabaseUrl } from "./db-env.mjs";

const sql = neon(getDatabaseUrl());

function generateStrongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.randomBytes(16);
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

const TARGET_ACCOUNTS = [
  {
    email: "ceo@yetaf-holding.com",
    label: "Direction (Super Admin)",
    envVar: "NEW_CEO_PASSWORD",
  },
  {
    email: "admin@yetaf-holding.com",
    label: "Executive Administrator (Admin)",
    envVar: "NEW_ADMIN_PASSWORD",
  },
  {
    email: "operations@yetaf-holding.com",
    label: "Operations Lead (Employee)",
    envVar: "NEW_STAFF_PASSWORD",
  },
  {
    email: "ceo@yetta-holding.com",
    label: "Legacy Alias: Direction",
    envVar: "NEW_CEO_PASSWORD",
  },
  {
    email: "admin@yetta-holding.com",
    label: "Legacy Alias: Administrator",
    envVar: "NEW_ADMIN_PASSWORD",
  },
  {
    email: "operations@yetta-holding.com",
    label: "Legacy Alias: Operations",
    envVar: "NEW_STAFF_PASSWORD",
  },
];

async function main() {
  console.log("==================================================================");
  console.log("🔒 YETAF HOLDING — Production Password Rotation Utility");
  console.log("==================================================================\n");

  const rotatedResults = [];

  for (const account of TARGET_ACCOUNTS) {
    const existing = await sql`SELECT id, email, full_name, role FROM users WHERE LOWER(email) = LOWER(${account.email}) LIMIT 1;`;
    if (existing.length === 0) {
      continue;
    }

    const user = existing[0];
    const newPassword =
      process.env[account.envVar]?.trim() || generateStrongPassword();
    const newHash = await bcrypt.hash(newPassword, 10);

    // 1. Update user password hash
    await sql`
      UPDATE users
      SET password_hash = ${newHash}
      WHERE id = ${user.id};
    `;

    // 2. Invalidate existing sessions so stolen tokens/sessions are instantly revoked
    await sql`
      DELETE FROM sessions
      WHERE user_id = ${user.id};
    `;

    rotatedResults.push({
      email: user.email,
      role: user.role,
      name: user.full_name,
      newPassword,
    });
  }

  if (rotatedResults.length === 0) {
    console.log("No targeted default accounts found in database to rotate.");
    return;
  }

  console.log("✅ Successfully rotated passwords and invalidated active sessions:\n");
  for (const res of rotatedResults) {
    console.log(`------------------------------------------------------------------`);
    console.log(`Account:  ${res.email} (${res.role} — ${res.name})`);
    console.log(`Password: ${res.newPassword}`);
  }
  console.log(`------------------------------------------------------------------\n`);
  console.log("⚠️  IMPORTANT: Copy and store these credentials in a secure vault now.");
  console.log("    These passwords will NOT be displayed again.\n");
}

main().catch((err) => {
  console.error("❌ Password rotation failed:", err);
  process.exit(1);
});

