import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthResult } from '../../auth.types';
import { UserLoggedInEvent } from '../../events/impl/user-logged-in.event';
import { signAccessToken } from '../../token.util';
import { LoginCommand } from '../impl/login.command';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ email, password }: LoginCommand): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.password, password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.eventBus.publish(new UserLoggedInEvent(user.id, user.email));

    return signAccessToken(this.jwtService, user.id, user.email);
  }
}
