import prisma from '@/lib/prisma';

/**
 * The cheapest possible round trip to the database.
 *
 * The health endpoint is polled, so this must not become load: no table, no
 * index, no planning of consequence.
 */
export async function ping(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
