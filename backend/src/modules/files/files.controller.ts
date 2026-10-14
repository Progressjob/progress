import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileCategory } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common/auth';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload/:category')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_242_880, files: 1 } }))
  upload(
    @CurrentUser() user: AuthUser,
    @Param('category', new ParseEnumPipe(FileCategory)) category: FileCategory,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('A file is required');
    return this.files.upload(user.id, file, category);
  }

  @Get(':id/public')
  async publicFile(@Param('id') id: string, @Res() response: Response) {
    const { file, stream } = await this.files.open(id);
    response.type(file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.originalFilename}"`);
    stream.pipe(response);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const { file, stream } = await this.files.open(id, user);
    response.type(file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`);
    stream.pipe(response);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.files.remove(id, user);
  }
}
