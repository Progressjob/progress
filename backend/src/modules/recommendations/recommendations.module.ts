import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TalentModule } from '../talent/talent.module';
import {
  AdminRecommendationsController,
  EmployerRecommendationsController,
} from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [AuthModule, TalentModule],
  controllers: [AdminRecommendationsController, EmployerRecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}