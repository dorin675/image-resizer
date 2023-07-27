import { SetMetadata } from '@nestjs/common';
import { userType } from '@prisma/client';

export const Roles = (...roles: userType[]) => SetMetadata('roles', roles);
