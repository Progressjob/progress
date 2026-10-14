import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { LocalDiskStorage, StorageService } from './storage.service';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    LocalDiskStorage,
    { provide: StorageService, useExisting: LocalDiskStorage },
  ],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
