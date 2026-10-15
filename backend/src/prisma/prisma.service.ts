import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  enableShutdownHooks(app: INestApplication): void {
    const closeApp = (): void => {
      void app.close();
    };
    process.once('SIGINT', closeApp);
    process.once('SIGTERM', closeApp);
    // Prisma 5+ library engine: $on('beforeExit') is unsupported; use process instead.
    process.once('beforeExit', closeApp);
  }
}
