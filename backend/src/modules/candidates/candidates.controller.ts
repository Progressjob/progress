import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { FilesService } from '../files/files.service';
import {
  CertificationDto,
  EducationDto,
  ExperienceDto,
  LanguageDto,
  ReplaceCandidateSkillsDto,
  ResumeMetaDto,
  UpdateCertificationDto,
  UpdateEducationDto,
  UpdateExperienceDto,
  UpdateLanguageDto,
  UpdateProfileDto,
} from './candidates.dto';
import { CandidatesService } from './candidates.service';

@ApiTags('candidate')
@ApiBearerAuth()
@Controller('candidate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('candidate')
export class CandidatesController {
  constructor(
    private readonly candidates: CandidatesService,
    private readonly files: FilesService,
  ) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return this.candidates.profile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.candidates.updateProfile(user.id, dto);
  }

  @Post('educations')
  addEducation(@CurrentUser() user: AuthUser, @Body() dto: EducationDto) {
    return this.candidates.addEducation(user.id, dto);
  }

  @Patch('educations/:id')
  updateEducation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.candidates.updateEducation(user.id, id, dto);
  }

  @Delete('educations/:id')
  deleteEducation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.deleteEducation(user.id, id);
  }

  @Post('experiences')
  addExperience(@CurrentUser() user: AuthUser, @Body() dto: ExperienceDto) {
    return this.candidates.addExperience(user.id, dto);
  }

  @Patch('experiences/:id')
  updateExperience(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.candidates.updateExperience(user.id, id, dto);
  }

  @Delete('experiences/:id')
  deleteExperience(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.deleteExperience(user.id, id);
  }

  @Put('skills')
  skills(@CurrentUser() user: AuthUser, @Body() dto: ReplaceCandidateSkillsDto) {
    return this.candidates.replaceSkills(user.id, dto);
  }

  @Post('certifications')
  addCertification(@CurrentUser() user: AuthUser, @Body() dto: CertificationDto) {
    return this.candidates.addCertification(user.id, dto);
  }

  @Patch('certifications/:id')
  updateCertification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    return this.candidates.updateCertification(user.id, id, dto);
  }

  @Delete('certifications/:id')
  deleteCertification(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.deleteCertification(user.id, id);
  }

  @Post('languages')
  addLanguage(@CurrentUser() user: AuthUser, @Body() dto: LanguageDto) {
    return this.candidates.addLanguage(user.id, dto);
  }

  @Patch('languages/:id')
  updateLanguage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.candidates.updateLanguage(user.id, id, dto);
  }

  @Delete('languages/:id')
  deleteLanguage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.deleteLanguage(user.id, id);
  }

  @Post('resumes')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_242_880, files: 1 } }))
  async addResume(
    @CurrentUser() user: AuthUser,
    @Body() dto: ResumeMetaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('A file is required');
    const uploaded = await this.files.upload(user.id, file, 'cv');
    const title = dto.title?.trim() || file.originalname;
    return this.candidates.addResume(user.id, uploaded.id, title);
  }

  @Get('resumes')
  resumes(@CurrentUser() user: AuthUser) {
    return this.candidates.listResumes(user.id);
  }

  @Patch('resumes/:id/default')
  setDefault(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.setDefaultResume(user.id, id);
  }

  @Delete('resumes/:id')
  deleteResume(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidates.deleteResume(user.id, id);
  }
}
