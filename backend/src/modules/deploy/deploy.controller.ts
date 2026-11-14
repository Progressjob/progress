import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@ApiTags('deploy')
@Controller('deploy')
export class DeployController {
  constructor(private readonly config: ConfigService) {}

  private verifySignature(req: RequestWithRawBody, secret: string): boolean {
    if (!secret) return false;

    // 1. Direct header token match or query param match
    const directToken =
      (req.headers['x-webhook-secret'] as string | undefined) ||
      (req.query.token as string | undefined);
    if (directToken && directToken === secret) {
      return true;
    }

    // 2. Official GitHub X-Hub-Signature-256 HMAC verification
    const sigHeader = req.headers['x-hub-signature-256'] as string | undefined;
    if (!sigHeader || !sigHeader.startsWith('sha256=')) {
      return false;
    }

    const payload = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSig = `sha256=${hmac.digest('hex')}`;

    const sigBuffer = Buffer.from(sigHeader);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Req() req: RequestWithRawBody) {
    const secret =
      this.config.get<string>('DEPLOY_WEBHOOK_SECRET') || process.env.DEPLOY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[DEPLOY] Webhook received but DEPLOY_WEBHOOK_SECRET is not configured.');
      throw new InternalServerErrorException('DEPLOY_WEBHOOK_SECRET is not configured on server.');
    }

    if (!this.verifySignature(req, secret)) {
      console.warn('[DEPLOY] Webhook rejected: Invalid signature or secret.');
      throw new UnauthorizedException('Unauthorized: Invalid signature.');
    }

    // Handle GitHub Ping
    const githubEvent = req.headers['x-github-event'];
    if (githubEvent === 'ping') {
      return { success: true, message: 'pong' };
    }

    // Only trigger on pushes to main branch
    const ref = (req.body as { ref?: string } | undefined)?.ref;
    if (ref && ref !== 'refs/heads/main') {
      return {
        success: true,
        message: `Ignored push to branch ${ref}. Only main branch triggers automatic deployment.`,
      };
    }

    // Locate deploy.sh
    const vpsStandardPath = '/home/d3l1v3ry/htdocs/progress-jobs/deploy.sh';
    const localRelativePath = path.resolve(__dirname, '../../../../deploy.sh');
    const deployScript = fs.existsSync(vpsStandardPath) ? vpsStandardPath : localRelativePath;

    if (!fs.existsSync(deployScript)) {
      console.error(`[DEPLOY] deploy.sh not found at ${deployScript}`);
      throw new InternalServerErrorException(`deploy.sh script not found at ${deployScript}`);
    }

    console.log(`[DEPLOY] Triggering deploy script: ${deployScript}`);

    // Spawn detached process with nohup so PM2 reload cannot kill it
    const child = spawn('nohup', ['/bin/bash', deployScript], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    return {
      success: true,
      message: 'Progress Jobs deployment triggered successfully in background.',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  getStatus(@Res() res: Response) {
    const vpsLogPath = '/home/d3l1v3ry/htdocs/progress-jobs/deploy.log';
    const localLogPath = path.resolve(__dirname, '../../../../deploy.log');
    const logFile = fs.existsSync(vpsLogPath) ? vpsLogPath : localLogPath;

    if (!fs.existsSync(logFile)) {
      return res.status(200).send('No deployment logs found yet.');
    }

    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');
      const recentLines = lines.slice(-80).join('\n');
      return res.status(200).type('text/plain').send(recentLines);
    } catch (err: unknown) {
      return res.status(500).send(`Failed to read deployment log: ${(err as Error).message}`);
    }
  }
}
