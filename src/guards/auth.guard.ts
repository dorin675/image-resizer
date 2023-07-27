import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from 'src/prisma/prisma.service';
import { tokenData } from 'src/users/dto/auth.dto';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length) {
      const request = context.switchToHttp().getRequest();
      const token = request.headers?.authorization;
      try {
        const payload: tokenData = jwt.verify(
          token,
          process.env.JWT_SECRET_KEY,
        ) as jwt.JwtPayload;
        const user = await this.prismaService.user.findUnique({
          where: {
            id: parseInt(payload.id),
          },
        });
        if (!user) {
          return false;
        }
        if (roles.includes(user.type)) {
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }
    return true;
  }
}
