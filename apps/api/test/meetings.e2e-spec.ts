import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/bootstrap';
import { PrismaService } from './../src/prisma/prisma.service';

const OWNER_EMAIL = 'meetings-e2e-owner@example.com';
const OTHER_EMAIL = 'meetings-e2e-other@example.com';
const PASSWORD = 'Sup3rSecret!';

type AuthResponseBody = { accessToken: string };

interface MeetingResponseBody {
  id: string;
  title: string;
  date: string;
  participants: string[];
}

const VALID_MEETING_PAYLOAD = {
  title: 'Sprint planning',
  date: '2026-08-01T10:00:00.000Z',
  participants: ['alice@example.com', 'bob@example.com'],
};

describe('Meetings (e2e)', () => {
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
    // Assumes meetings cascade-delete with their owning user.
    await prisma.user.deleteMany({
      where: { email: { in: [OWNER_EMAIL, OTHER_EMAIL] } },
    });
  });

  async function registerUser(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    return (response.body as AuthResponseBody).accessToken;
  }

  function authorized(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  describe('POST /meetings', () => {
    it('creates a new meeting for the authenticated user', async () => {
      const token = await registerUser(OWNER_EMAIL);

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send(VALID_MEETING_PAYLOAD)
        .expect(201);

      const body = response.body as MeetingResponseBody;
      expect(typeof body.id).toBe('string');
      expect(body.title).toBe(VALID_MEETING_PAYLOAD.title);
      expect(new Date(body.date).toISOString()).toBe(
        VALID_MEETING_PAYLOAD.date,
      );
      expect(body.participants).toEqual(VALID_MEETING_PAYLOAD.participants);
    });

    it('rejects an unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .send(VALID_MEETING_PAYLOAD)
        .expect(401);
    });

    it('rejects a request with an invalid token with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized('not-a-valid-token'))
        .send(VALID_MEETING_PAYLOAD)
        .expect(401);
    });

    it('rejects a missing title with 400 Bad Request', async () => {
      const token = await registerUser(OWNER_EMAIL);

      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send({ ...VALID_MEETING_PAYLOAD, title: undefined })
        .expect(400);
    });

    it('rejects an empty title with 400 Bad Request', async () => {
      const token = await registerUser(OWNER_EMAIL);

      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send({ ...VALID_MEETING_PAYLOAD, title: '' })
        .expect(400);
    });

    it('rejects a missing date with 400 Bad Request', async () => {
      const token = await registerUser(OWNER_EMAIL);

      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send({ ...VALID_MEETING_PAYLOAD, date: undefined })
        .expect(400);
    });

    it('rejects a malformed date with 400 Bad Request', async () => {
      const token = await registerUser(OWNER_EMAIL);

      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send({ ...VALID_MEETING_PAYLOAD, date: 'not-a-date' })
        .expect(400);
    });

    it('rejects a missing participants list with 400 Bad Request', async () => {
      const token = await registerUser(OWNER_EMAIL);

      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send({ ...VALID_MEETING_PAYLOAD, participants: undefined })
        .expect(400);
    });

    it('rejects participants that are not a list of emails with 400 Bad Request', async () => {
      const token = await registerUser(OWNER_EMAIL);

      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send({ ...VALID_MEETING_PAYLOAD, participants: ['not-an-email'] })
        .expect(400);
    });
  });

  describe('GET /meetings', () => {
    it('rejects an unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/meetings').expect(401);
    });

    it('returns an empty list for a user with no meetings', async () => {
      const token = await registerUser(OWNER_EMAIL);

      const response = await request(app.getHttpServer())
        .get('/meetings')
        .set(authorized(token))
        .expect(200);

      expect(response.body as unknown).toEqual([]);
    });

    it("returns only the authenticated user's own meetings", async () => {
      const ownerToken = await registerUser(OWNER_EMAIL);
      const otherToken = await registerUser(OTHER_EMAIL);

      const created = await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(ownerToken))
        .send(VALID_MEETING_PAYLOAD)
        .expect(201);

      await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(otherToken))
        .send({ ...VALID_MEETING_PAYLOAD, title: "Someone else's meeting" })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/meetings')
        .set(authorized(ownerToken))
        .expect(200);

      const body = response.body as MeetingResponseBody[];
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe((created.body as MeetingResponseBody).id);
    });
  });

  describe('GET /meetings/:id', () => {
    it('rejects an unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/meetings/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('returns the meeting when it belongs to the authenticated user', async () => {
      const token = await registerUser(OWNER_EMAIL);

      const created = await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(token))
        .send(VALID_MEETING_PAYLOAD)
        .expect(201);

      const meetingId = (created.body as MeetingResponseBody).id;

      const response = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}`)
        .set(authorized(token))
        .expect(200);

      const body = response.body as MeetingResponseBody;
      expect(body.id).toBe(meetingId);
      expect(body.title).toBe(VALID_MEETING_PAYLOAD.title);
      expect(body.participants).toEqual(VALID_MEETING_PAYLOAD.participants);
    });

    it('returns 404 Not Found for an id that does not exist', async () => {
      const token = await registerUser(OWNER_EMAIL);

      await request(app.getHttpServer())
        .get('/meetings/00000000-0000-0000-0000-000000000000')
        .set(authorized(token))
        .expect(404);
    });

    it('returns 404 Not Found for a meeting that belongs to a different user', async () => {
      const ownerToken = await registerUser(OWNER_EMAIL);
      const otherToken = await registerUser(OTHER_EMAIL);

      const created = await request(app.getHttpServer())
        .post('/meetings')
        .set(authorized(otherToken))
        .send(VALID_MEETING_PAYLOAD)
        .expect(201);

      const meetingId = (created.body as MeetingResponseBody).id;

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}`)
        .set(authorized(ownerToken))
        .expect(404);
    });
  });
});
