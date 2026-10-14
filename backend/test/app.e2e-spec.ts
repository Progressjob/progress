import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

const dbDescribe = process.env.TEST_DATABASE_URL ? describe : describe.skip;

dbDescribe('API acceptance (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-that-is-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-that-is-at-least-32-characters';
    const { AppModule } = await import('../src/app.module');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  it('serves the health endpoint', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('ok'));
  });

  it('does not expose drafts through public search', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/jobs').expect(200);
    expect(response.body.data.every((job: { status: string }) => job.status === 'published')).toBe(
      true,
    );
  });

  it('rejects unauthenticated access to candidate CVs', () => {
    return request(app.getHttpServer())
      .get('/api/v1/files/00000000-0000-0000-0000-000000000000/download')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
