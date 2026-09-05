import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
// Validates the environment as a side effect of this import, so a missing or
// malformed variable fails at boot rather than as an opaque error under load.
import { env } from '@/server/env';

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
 return new PrismaClient({ adapter });
};

declare const globalThis: {
 prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
