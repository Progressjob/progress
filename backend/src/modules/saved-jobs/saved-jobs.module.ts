import { Controller, Delete, Get, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { AuthModule } from '../auth/auth.module';
import { SavedJobsService } from './saved-jobs.service';

@ApiTags('saved jobs')
@ApiBearerAuth()
@Controller('candidate/saved-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('candidate')
class SavedJobsController {
  constructor(private readonly saved: SavedJobsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.saved.list(user.id);
  }

  @Post(':jobId')
  save(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string) {
    return this.saved.save(user.id, jobId);
  }

  @Delete(':jobId')
  remove(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string) {
    return this.saved.remove(user.id, jobId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [SavedJobsController],
  providers: [SavedJobsService],
})
export class SavedJobsModule {}
