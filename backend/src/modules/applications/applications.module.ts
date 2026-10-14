import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  CandidateApplicationsController,
  EmployerApplicationsController,
} from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [AuthModule],
  controllers: [CandidateApplicationsController, EmployerApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
