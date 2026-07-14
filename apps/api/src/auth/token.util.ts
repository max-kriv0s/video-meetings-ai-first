import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../jwt/jwt.types';
import { AuthResult } from './auth.types';

export async function signAccessToken(
  jwtService: JwtService,
  userId: string,
  email: string,
): Promise<AuthResult> {
  const payload: JwtPayload = { sub: userId, email };
  const accessToken = await jwtService.signAsync(payload);
  return { accessToken };
}
