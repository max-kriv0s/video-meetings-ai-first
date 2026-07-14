import { ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthResult } from '../../auth.types';
import { UserRegisteredEvent } from '../../events/impl/user-registered.event';
import { signAccessToken } from '../../token.util';
import { RegisterCommand } from '../impl/register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<
  RegisterCommand,
  AuthResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ email, password }: RegisterCommand): Promise<AuthResult> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword },
    });

    this.eventBus.publish(new UserRegisteredEvent(user.id, user.email));

    return signAccessToken(this.jwtService, user.id, user.email);
  }
}
