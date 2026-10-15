import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  prismaOptimized?: boolean;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (!globalForPrisma.prismaOptimized) {
  // Otimizações de alta concorrência e throughput máximo para SQLite
  Promise.all([
    prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;'),
    prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;'),
    prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;'),
    prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;'),
    prisma.$queryRawUnsafe('PRAGMA cache_size = -64000;'),
  ]).catch((err) => {
    // Silencia em ambientes onde o banco ainda está sendo gerado
    if (process.env.NODE_ENV === 'development') {
      console.warn('Configuração de pragmas SQLite:', err.message || err);
    }
  });
  globalForPrisma.prismaOptimized = true;
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
