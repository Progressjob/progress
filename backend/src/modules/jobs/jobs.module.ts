import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AdminJobsController,
  EmployerJobsController,
  PublicJobsController,
} from './jobs.controller';
import { JobPostingPolicy, JobsService } from './jobs.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicJobsController, AdminJobsController, EmployerJobsController],
  providers: [JobsService, JobPostingPolicy],
  exports: [JobsService, JobPostingPolicy],
})
export class JobsModule {}
