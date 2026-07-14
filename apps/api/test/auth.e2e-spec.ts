import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/bootstrap';
import { PrismaService } from './../src/prisma/prisma.service';

const REGISTERED_EMAIL = 'auth-e2e@example.com';
const UNREGISTERED_EMAIL = 'auth-e2e-unregistered@example.com';
const PASSWORD = 'Sup3rSecret!';
const WRONG_PASSWORD = 'wrong-password';

type AuthResponseBody = { accessToken: string };

// Assumes the standard JWT convention: the `sub` claim carries the user id.
function decodeJwtPayload(token: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
  ) as Record<string, unknown>;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [REGISTERED_EMAIL, UNREGISTERED_EMAIL] } },
    });
  });

  describe('POST /auth/register', () => {
    it('creates a new user and returns a JWT access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(201);

      const body = response.body as AuthResponseBody;
      expect(Object.keys(body)).toEqual(['accessToken']);
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.split('.')).toHaveLength(3);
    });

    it('lets the newly registered user log in afterwards', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(200);
    });

    it('rejects registering the same email twice with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(409);
    });

    it('rejects a malformed email with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: PASSWORD })
        .expect(400);
    });

    it('rejects a missing email with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: PASSWORD })
        .expect(400);
    });

    it('rejects a missing password with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs an existing user in and returns a JWT access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(200);

      const body = response.body as AuthResponseBody;
      expect(Object.keys(body)).toEqual(['accessToken']);
      expect(typeof body.accessToken).toBe('string');
    });

    it('does not create a new user on login (identifies the same account as registration)', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(200);

      const registerPayload = decodeJwtPayload(
        (registerResponse.body as AuthResponseBody).accessToken,
      );
      const loginPayload = decodeJwtPayload(
        (loginResponse.body as AuthResponseBody).accessToken,
      );

      expect(registerPayload.sub).toBeDefined();
      expect(loginPayload.sub).toBe(registerPayload.sub);
    });

    it('rejects a login for an email that was never registered with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: UNREGISTERED_EMAIL, password: PASSWORD })
        .expect(401);
    });

    it('rejects a login with the wrong password with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: REGISTERED_EMAIL, password: WRONG_PASSWORD })
        .expect(401);
    });

    it('returns the same 401 response for an unknown email and a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: REGISTERED_EMAIL, password: PASSWORD })
        .expect(201);

      const unknownEmailResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: UNREGISTERED_EMAIL, password: PASSWORD });

      const wrongPasswordResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: REGISTERED_EMAIL, password: WRONG_PASSWORD });

      expect(unknownEmailResponse.status).toBe(401);
      expect(wrongPasswordResponse.status).toBe(401);
      expect(unknownEmailResponse.body as unknown).toEqual(
        wrongPasswordResponse.body as unknown,
      );
    });

    it('rejects a missing email with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: PASSWORD })
        .expect(400);
    });

    it('rejects a missing password with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: REGISTERED_EMAIL })
        .expect(400);
    });
  });
});
