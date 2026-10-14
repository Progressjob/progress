import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController, PublicSupportController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicSupportController, AdminController],
  providers: [AdminService],
})
export class AdminModule {}
