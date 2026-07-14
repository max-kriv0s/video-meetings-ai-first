import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
