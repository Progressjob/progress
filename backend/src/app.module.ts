import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuditInterceptor } from './common/audit.interceptor';
import { envValidationSchema } from './config/env.validation';
import { AdminModule } from './modules/admin/admin.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuthModule } from './modules/auth/auth.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { FilesModule } from './modules/files/files.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SavedJobsModule } from './modules/saved-jobs/saved-jobs.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    FilesModule,
    TaxonomyModule,
    CompaniesModule,
    JobsModule,
    CandidatesModule,
    ApplicationsModule,
    NotificationsModule,
    SavedJobsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}
