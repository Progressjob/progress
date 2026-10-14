import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AdminCompaniesController,
  EmployerCompaniesController,
  PublicCompaniesController,
} from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [AuthModule],
  controllers: [
    PublicCompaniesController,
    AdminCompaniesController,
    EmployerCompaniesController,
  ],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
