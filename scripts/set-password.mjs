#!/usr/bin/env node
/**
 * Sets a password for an existing account, from the command line.
 *
 * Needed because accounts that predate first-party auth have no password: the
 * old provider held the credential, and it did not come with us. Use this to
 * get the first administrator back in, then let everyone else re-register or
 * sign in with Google.
 *
 * Usage:
 *   node scripts/set-password.mjs someone@example.com 'a long passphrase'
 *   node scripts/set-password.mjs someone@example.com 'a long passphrase' --superadmin
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { webcrypto } from 'node:crypto';

const crypto = globalThis.crypto ?? webcrypto;

const [emailRaw, password, ...flags] = process.argv.slice(2);
if (!emailRaw || !password) {
  console.error('Usage: node scripts/set-password.mjs <email> <password> [--superadmin]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}

const ITERATIONS = 600_000;

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(plain.normalize('NFKC')), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256,
  );
  return `pbkdf2$sha256$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const email = emailRaw.trim().toLowerCase();

try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) {
    console.error(`No account with the address ${email}.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      ...(flags.includes('--superadmin') ? { role: 'SUPERADMIN', canCreateEvents: true } : {}),
    },
  });

  // Any session opened before a credential change must not survive it.
  const { count } = await prisma.session.deleteMany({ where: { userId: user.id } });

  console.log(`Password set for ${email}. ${count} existing session(s) revoked.`);
  if (flags.includes('--superadmin')) console.log('Role set to SUPERADMIN.');
} finally {
  await prisma.$disconnect();
}
