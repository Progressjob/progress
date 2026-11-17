import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { OfficeCandidatesController } from './office-candidates.controller';
import { OfficeCandidatesService } from './office-candidates.service';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [OfficeCandidatesController],
  providers: [OfficeCandidatesService],
})
export class OfficeCandidatesModule {}
