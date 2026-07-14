import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AuthResult } from './auth.types';
import { LoginCommand } from './commands/impl/login.command';
import { RegisterCommand } from './commands/impl/register.command';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  register(@Body() dto: AuthCredentialsDto): Promise<AuthResult> {
    return this.commandBus.execute(
      new RegisterCommand(dto.email, dto.password),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AuthCredentialsDto): Promise<AuthResult> {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password));
  }
}
