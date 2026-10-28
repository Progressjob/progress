import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AdminTalentController,
  EmployerTalentController,
  TalentBrowseController,
} from './talent.controller';
import { TalentService } from './talent.service';

@Module({
  imports: [AuthModule],
  controllers: [EmployerTalentController, AdminTalentController, TalentBrowseController],
  providers: [TalentService],
})
export class TalentModule {}
