import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, closeTestApp } from './e2e-utils';

jest.setTimeout(30000);

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mongoServer: import('mongodb-memory-server').MongoMemoryServer;
  let jwtToken: string | undefined;
  let registeredEmail: string | undefined;

  beforeAll(async () => {
    // Ensure JWT env for JwtModule
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '3600s';

    const created = await createTestApp();
    app = created.app;
    mongoServer = created.mongoServer;
  });

  afterAll(async () => {
    await closeTestApp(app, mongoServer);
  });

  it('/auth/register (POST) 201', async () => {
    const payload = {
      name: 'Gandalf The Grey',
      email: `gandalf.thegrey+${Date.now()}@istari.middleearth`,
      password: 'GandalfStrongP@ss123!',
    };

    const server = app.getHttpServer() as unknown as App;
    const res = await request(server)
      .post('/auth/register')
      .send(payload)
      .expect(201);
    const body = res.body as { _id: string; email: string };
    expect(body).toHaveProperty('_id');
    expect(body.email).toBe(payload.email);
    registeredEmail = payload.email;
  });

  it('/auth/login (POST) 200', async () => {
    const credentials = {
      email: registeredEmail as string,
      password: 'GandalfStrongP@ss123!',
    };

    const server = app.getHttpServer() as unknown as App;
    const res = await request(server)
      .post('/auth/login')
      .send(credentials)
      .expect((r) => {
        if (![200, 201].includes(r.status))
          throw new Error(`Unexpected status ${r.status}`);
      });
    const body = res.body as { access_token?: string };
    expect(body.access_token).toBeDefined();
    jwtToken = body.access_token;
  });

  it('/auth/me (GET) 200', async () => {
    expect(jwtToken).toBeDefined();
    const server = app.getHttpServer() as unknown as App;
    const res = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const body = res.body as { email: string };
    expect(body.email).toBe(registeredEmail);
  });
});
