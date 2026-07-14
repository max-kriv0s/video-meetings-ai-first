import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '../jwt/jwt.module';
import { AuthController } from './auth.controller';
import { LoginHandler } from './commands/handlers/login.handler';
import { RegisterHandler } from './commands/handlers/register.handler';
import { UserLoggedInHandler } from './events/handlers/user-logged-in.handler';
import { UserRegisteredHandler } from './events/handlers/user-registered.handler';

const CommandHandlers = [RegisterHandler, LoginHandler];
const EventHandlers = [UserRegisteredHandler, UserLoggedInHandler];

@Module({
  imports: [CqrsModule, JwtModule],
  controllers: [AuthController],
  providers: [...CommandHandlers, ...EventHandlers],
})
export class AuthModule {}
