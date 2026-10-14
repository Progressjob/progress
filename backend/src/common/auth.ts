import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  id: string;
  email: string | null;
  roles: string[];
}

export interface AuthRequest {
  user?: AuthUser;
  params: Record<string, string>;
  body?: Record<string, unknown>;
  ip?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user) throw new UnauthorizedException();
    return user;
  },
);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user || !required.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

@Injectable()
export class CompanyMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.user) throw new UnauthorizedException();
    if (request.user.roles.some((r) => r === 'admin' || r === 'moderator')) return true;

    const companyId =
      request.params.companyId ??
      (typeof request.body?.companyId === 'string' ? request.body.companyId : undefined);
    if (!companyId) throw new ForbiddenException('Company context is required');

    const membership = await this.prisma.companyMember.findFirst({
      where: { companyId, userId: request.user.id, status: 'active' },
    });
    if (!membership) throw new ForbiddenException('Not an active company member');
    return true;
  }
}
