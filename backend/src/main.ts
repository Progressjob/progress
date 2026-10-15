import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.use(helmet());
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

  const port = Number(process.env.PORT ?? 3000);
  try {
    await app.listen(port);
  } catch (err: unknown) {
    const code =
      err !== null && typeof err === 'object' && 'code' in err
        ? (err as NodeJS.ErrnoException).code
        : undefined;
    if (code === 'EADDRINUSE') {
      console.error(
        [
          `Port ${port} is already in use.`,
          'Stop other backend dev servers (only one `npm run dev` at a time), then free the port:',
          `  netstat -ano | findstr :${port}`,
          '  taskkill /PID <pid> /F',
        ].join('\n'),
      );
    }
    throw err;
  }
}
void bootstrap();
