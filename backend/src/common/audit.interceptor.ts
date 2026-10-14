import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { concatMap, Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequest } from './auth';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      AuthRequest & { method: string; route?: { path?: string }; originalUrl?: string }
    >();
    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const path = request.originalUrl ?? request.route?.path ?? '';
    if (!isMutation || !path.includes('/admin/') || !request.user) return next.handle();

    return next.handle().pipe(
      concatMap(async (result: unknown) => {
        const body = request.body ?? {};
        const entityId =
          request.params.id ??
          (typeof body.id === 'string' ? body.id : undefined) ??
          (typeof result === 'object' &&
          result !== null &&
          'id' in result &&
          typeof result.id === 'string'
            ? result.id
            : undefined);
        await this.prisma.adminAuditLog.create({
          data: {
            actorUserId: request.user!.id,
            action: `${request.method.toLowerCase()}.${path.split('?')[0]}`,
            entityType: path.split('/').filter(Boolean).at(-2) ?? 'admin',
            entityId,
            details: { params: request.params },
            ipAddress: request.ip,
          },
        });
        return result;
      }),
    );
  }
}
