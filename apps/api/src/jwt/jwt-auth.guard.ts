import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser, JwtPayload, RequestWithUser } from './jwt.types';

function extractBearerToken(
  authorizationHeader: string | undefined,
): string | undefined {
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];
  return scheme === 'Bearer' ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const user: AuthenticatedUser = {
      userId: payload.sub,
      email: payload.email,
    };
    request.user = user;

    return true;
  }
}
