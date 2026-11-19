import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { db: PrismaClient };
// Override is useful for isolated tests and local backups. The default remains prisma/ledger.db.
const options = process.env.LEDGER_DATABASE_URL ? { datasourceUrl: process.env.LEDGER_DATABASE_URL } : undefined;
export const db = globalForPrisma.db || new PrismaClient(options);
if (process.env.NODE_ENV !== 'production') globalForPrisma.db = db;
