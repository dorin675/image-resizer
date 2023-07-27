import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { userType } from '@prisma/client';
import { VerifyUserDto } from './dto/verify-user.dto';
import { SignInUserDto } from './dto/sign-in.dto';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}
  async create({ firstName, lastName, email, password }: CreateUserDto) {
    const oldUser = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (oldUser) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = await bcrypt.hash('banana', 10);
    console.log(verificationToken);
    const user = await this.prismaService.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        type: userType.USER,
        verificationToken,
      },
    });

    return user.verificationToken;
  }
  async getToken(email: string) {
    const SECRET_KEY = process.env.JWT_SECRET_KEY;
    const currentUser = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    const token = jwt.sign(
      {
        id: currentUser.id,
        type: currentUser.type,
        isActive: currentUser.isActive,
        verified: currentUser.verified,
      },
      SECRET_KEY,
      { expiresIn: '1h' },
    );
    return token;
  }

  async verifyUser({ verificationCode, email }: VerifyUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (user.verified) {
      throw new ConflictException('User already verified');
    }
    if (!verificationCode) {
      throw new NotFoundException('Put your verification code');
    }
    const matchCodes = await bcrypt.compare(
      verificationCode,
      user.verificationToken,
    );
    if (!matchCodes) {
      throw new ConflictException('Verification code is invalid');
    }
    const verificatedUser = await this.prismaService.user.update({
      where: {
        email,
      },
      data: { verified: true },
    });
    const token = this.getToken(verificatedUser.email);
    return token;
  }
  async signIn({ email, password }: SignInUserDto) {
    const currentUser = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (!currentUser) {
      throw new NotFoundException('User Not Found');
    }
    const passwordMatch = await bcrypt.compare(password, currentUser.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid Password');
    }
    return this.getToken(currentUser.email);
  }
  async findAll() {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        verified: true,
      },
    });
    return users;
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!user) {
      throw new NotFoundException(`Don't exist user with id:${id}`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!user) {
      throw new NotFoundException(`Don't exist user with id:${id}`);
    }
    const updatedUser = this.prismaService.user.update({
      where: {
        id,
      },
      data: updateUserDto,
    });
    return updatedUser;
  }

  async remove(id: number) {
    const deletedUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!deletedUser) {
      throw new NotFoundException('User does not exist!');
    }
    await this.prismaService.user.delete({
      where: {
        id,
      },
    });

    return deletedUser;
  }
}
