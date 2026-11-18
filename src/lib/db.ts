import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// DATABASE_URL is the pooled connection (Neon's -pooler host in deployed
// environments). Migrations use the direct URL instead; see prisma7.config.ts.
function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  // On Vercel Fluid compute, closes idle connections before an instance is
  // suspended so they don't leak. A no-op everywhere else.
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
