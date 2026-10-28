import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, promises as fs } from 'fs';
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
    const configured = config.get<string>('STORAGE_ROOT', './storage');
    const directPath = resolve(configured);
    const backendPath = resolve(process.cwd(), 'backend', configured);
    if (!existsSync(directPath) && existsSync(backendPath)) {
      this.root = backendPath;
    } else {
      this.root = directPath;
    }
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.safePath(key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, data, { flag: 'wx' });
  }

  read(key: string): Readable {
    const filePath = this.resolveExistingPath(key);
    return createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const path = this.safePath(key);
    await fs.rm(path, { force: true });
    const altBackend = resolve(process.cwd(), 'backend/storage', key);
    if (altBackend !== path && existsSync(altBackend)) {
      await fs.rm(altBackend, { force: true });
    }
    const altRoot = resolve(process.cwd(), 'storage', key);
    if (altRoot !== path && existsSync(altRoot)) {
      await fs.rm(altRoot, { force: true });
    }
  }

  private resolveExistingPath(key: string): string {
    const primary = this.safePath(key);
    if (existsSync(primary)) return primary;
    const fallbackBackend = resolve(process.cwd(), 'backend/storage', key);
    if (existsSync(fallbackBackend)) return fallbackBackend;
    const fallbackRoot = resolve(process.cwd(), 'storage', key);
    if (existsSync(fallbackRoot)) return fallbackRoot;
    return primary;
  }

  private safePath(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root)) {
      const fallbackBackend = resolve(process.cwd(), 'backend/storage', key);
      const fallbackRoot = resolve(process.cwd(), 'storage', key);
      if (existsSync(fallbackBackend)) return fallbackBackend;
      if (existsSync(fallbackRoot)) return fallbackRoot;
      throw new Error('Unsafe storage key');
    }
    return path;
  }
}
