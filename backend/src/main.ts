import { existsSync, unlinkSync, watch, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { PrismaService } from './prisma/prisma.service';

const load = createRequire(__filename);

type ModuleNotFound = NodeJS.ErrnoException & { requireStack?: string[] };

function loadAppModule(): typeof import('./app.module').AppModule {
  return (load('./app.module') as typeof import('./app.module')).AppModule;
}

function missingOutputFile(err: ModuleNotFound): string | null {
  const spec = /Cannot find module '([^']+)'/.exec(err.message)?.[1];
  const from = err.requireStack?.[0];
  if (!spec || !from || !spec.startsWith('.')) return null;
  const base = join(dirname(from), spec);
  return base.endsWith('.js') ? base : `${base}.js`;
}

function launch(attempt = 0): void {
  let AppModule: ReturnType<typeof loadAppModule>;
  try {
    AppModule = loadAppModule();
  } catch (err) {
    const moduleErr = err as ModuleNotFound;
    const isDev = (process.env.NODE_ENV ?? 'development') === 'development';
    if (!isDev || moduleErr?.code !== 'MODULE_NOT_FOUND' || attempt >= 8) throw err;
    const missingJs = missingOutputFile(moduleErr);
    if (missingJs && existsSync(missingJs)) {
      launch(attempt + 1);
      return;
    }
    const watchDir = missingJs ? dirname(missingJs) : __dirname;
    try {
      const watcher = watch(watchDir, () => {
        watcher.close();
        launch(attempt + 1);
      });
    } catch {
      throw err;
    }
    return;
  }
  void bootstrap(AppModule);
}

const devPortFile = join(__dirname, '..', '.dev-server-port');

if (!(BigInt.prototype as { toJSON?: () => number | string }).toJSON) {
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    configurable: true,
    value() {
      const asNumber = Number(this);
      return Number.isSafeInteger(asNumber) ? asNumber : this.toString();
    },
  });
}

async function listenOnPort(app: INestApplication, port: number): Promise<void> {
  await app.listen(port);
}

async function listenWithPortFallback(app: INestApplication, preferredPort: number): Promise<number> {
  const isDev = (process.env.NODE_ENV ?? 'development') === 'development';
  const attempts = isDev ? 10 : 1;

  for (let offset = 0; offset < attempts; offset += 1) {
    const port = preferredPort + offset;
    try {
      await listenOnPort(app, port);
      if (isDev) {
        writeFileSync(devPortFile, String(port), 'utf8');
      }
      if (offset > 0) {
        console.warn(
          `Port ${preferredPort} was busy; using http://localhost:${port} (API base /api/v1).`,
        );
      }
      console.log(`Listening on http://localhost:${port}/api/v1 (Swagger: /api/docs)`);
      return port;
    } catch (err: unknown) {
      const code =
        err !== null && typeof err === 'object' && 'code' in err
          ? (err as NodeJS.ErrnoException).code
          : undefined;
      if (code === 'EADDRINUSE' && offset < attempts - 1) {
        continue;
      }
      if (code === 'EADDRINUSE') {
        console.error(
          [
            `No free port in range ${preferredPort}-${preferredPort + attempts - 1}.`,
            'Stop extra backend dev servers, then retry:',
            `  netstat -ano | findstr :${preferredPort}`,
            '  taskkill /PID <pid> /F',
          ].join('\n'),
        );
      }
      throw err;
    }
  }

  throw new Error(`Failed to bind a port starting at ${preferredPort}`);
}

async function bootstrap(AppModule: ReturnType<typeof loadAppModule>): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.enableCors();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ethiojobs-style API')
    .setDescription('Job portal API for candidates, employers, and administrators')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  app.get(PrismaService).enableShutdownHooks(app);

  const preferredPort = Number(process.env.PORT ?? 3000);
  try {
    unlinkSync(devPortFile);
  } catch {
    // no stale port file
  }
  await listenWithPortFallback(app, preferredPort);
}
launch();
