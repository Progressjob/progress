import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import { Readable } from 'stream';

export abstract class StorageService {
  abstract put(key: string, data: Buffer): Promise<void>;
  abstract read(key: string): Readable;
  abstract delete(key: string): Promise<void>;
}

@Injectable()
export class LocalDiskStorage implements StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('STORAGE_ROOT', './storage'));
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.safePath(key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, data, { flag: 'wx' });
  }

  read(key: string): Readable {
    return createReadStream(this.safePath(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.safePath(key), { force: true });
  }

  private safePath(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root)) throw new Error('Unsafe storage key');
    return path;
  }
}
