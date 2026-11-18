import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import {
  OfficeCandidateFieldsDto,
  UpdateOfficeCandidateDto,
  UpdateOfficeStatusDto,
} from './office-candidates.dto';
import { officeTemplateBuffer, readOfficeSheet } from './office-import';
import { OfficeCandidatesService } from './office-candidates.service';

@ApiTags('admin office candidates')
@ApiBearerAuth()
@Controller('admin/office-candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class OfficeCandidatesController {
  constructor(private readonly office: OfficeCandidatesService) {}

  @Get('import/template')
  async template(@Res() response: Response) {
    const buffer = await officeTemplateBuffer(await this.office.exportRows());
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="office-candidates.xlsx"');
    response.send(buffer);
  }

  @Post('import/preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_242_880, files: 1 } }))
  async preview(@UploadedFile() file?: Express.Multer.File) {
    const taken = await this.office.takenContacts();
    const rows = await readOfficeSheet(this.buffer(file), taken.phones, taken.fans);
    return { rows: rows.map(({ data: _data, ...row }) => row) };
  }

  @Post('import/commit')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_242_880, files: 1 } }))
  async commit(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    const taken = await this.office.takenContacts();
    const rows = await readOfficeSheet(this.buffer(file), taken.phones, taken.fans);
    let created = 0;
    const skipped: { row: number; errors: string[] }[] = [];
    for (const row of rows) {
      if (row.status !== 'ok' || !row.data) {
        skipped.push({ row: row.row, errors: row.errors });
        continue;
      }
      await this.office.create(user.id, row.data);
      created += 1;
    }
    return { created, skipped: skipped.length, errors: skipped };
  }

  @Get()
  list(
    @Query('q') q?: string,
    @Query('officeStatus') officeStatus?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.office.list(q, officeStatus, Number(page) || 1, Number(pageSize) || 8);
  }

  @Delete(':profileId')
  remove(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.office.remove(profileId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: OfficeCandidateFieldsDto) {
    return this.office.create(user.id, dto);
  }

  @Get(':profileId/matching-jobs')
  matchingJobs(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.office.matchingJobs(profileId);
  }

  @Post(':profileId/cv')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_242_880, files: 1 } }))
  uploadCv(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('A file is required');
    return this.office.attachCv(profileId, file);
  }

  @Post(':profileId/issue-access')
  issueAccess(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.office.issueAccess(profileId);
  }

  @Patch(':profileId/status')
  status(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateOfficeStatusDto,
  ) {
    return this.office.setStatus(profileId, dto.officeStatus);
  }

  @Get(':profileId')
  detail(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.office.detail(profileId);
  }

  @Patch(':profileId')
  update(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateOfficeCandidateDto,
  ) {
    return this.office.update(profileId, dto);
  }

  private buffer(file?: Express.Multer.File): Buffer {
    if (!file?.buffer?.length) throw new BadRequestException('An Excel file is required');
    return file.buffer;
  }
}
