import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '@/server/env';
import { getCloudflareContext } from '@opennextjs/cloudflare';

let cachedClient: PrismaClient | null = null;
let cachedConnectionString: string | null = null;

function getClient(): PrismaClient {
  let connectionString = env.DATABASE_URL;

  const isCloudflare = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
  const cfGlobal = (globalThis as unknown as { [k: symbol]: { env?: { HYPERDRIVE?: { connectionString?: string } } } })[Symbol.for('__cloudflare-context__')];

  if (cfGlobal?.env?.HYPERDRIVE?.connectionString) {
    connectionString = cfGlobal.env.HYPERDRIVE.connectionString;
  } else if (isCloudflare) {
    try {
      const cf = getCloudflareContext();
      if (cf?.env && (cf.env as unknown as { HYPERDRIVE?: { connectionString?: string } }).HYPERDRIVE?.connectionString) {
        connectionString = (cf.env as unknown as { HYPERDRIVE: { connectionString: string } }).HYPERDRIVE.connectionString;
      }
    } catch {
      // Ignored outside Cloudflare request context
    }
  }

  if (cachedClient && cachedConnectionString === connectionString) {
    return cachedClient;
  }

  const pool = new Pool({
    connectionString,
    maxUses: 1,
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  cachedClient = client;
  cachedConnectionString = connectionString;

  return client;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
