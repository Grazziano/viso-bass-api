import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, closeTestApp } from './e2e-utils';
import type { MongoMemoryServer } from 'mongodb-memory-server';

jest.setTimeout(30000);

describe('Auth Roles (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const created = await createTestApp();
    app = created.app;
    mongoServer = created.mongoServer;
  });

  afterAll(async () => {
    await closeTestApp(app, mongoServer);
  });

  async function register(
    email: string,
    password: string,
    role: 'user' | 'admin',
  ) {
    const server = app.getHttpServer() as unknown as App;
    await request(server)
      .post('/auth/register')
      .send({ name: email.split('@')[0], email, password, role })
      .expect(201);
  }

  async function login(email: string, password: string): Promise<string> {
    const server = app.getHttpServer() as unknown as App;
    const res = await request(server)
      .post('/auth/login')
      .send({ email, password })
      .expect((r) => {
        if (![200, 201].includes(r.status))
          throw new Error(`Unexpected status ${r.status}`);
      });
    return (res.body as { access_token: string }).access_token;
  }

  it('should forbid user role to create object', async () => {
    const email = `user.${Date.now()}@example.com`;
    const password = 'StrongP@ss123!';
    await register(email, password, 'user');
    const token = await login(email, password);
    await request(app.getHttpServer() as unknown as App)
      .post('/object')
      .set('Authorization', `Bearer ${token}`)
      .send({
        obj_networkMAC: '00:1B:44:11:3A:D1',
        obj_name: 'Obj',
        obj_model: 'M',
        obj_brand: 'B',
        obj_function: ['f'],
        obj_restriction: ['r'],
        obj_limitation: ['l'],
        obj_access: 1,
        obj_location: 1,
        obj_qualification: 1,
        obj_status: 1,
      })
      .expect(403);
  });

  it('should allow admin role to create object', async () => {
    const email = `admin.${Date.now()}@example.com`;
    const password = 'StrongP@ss123!';
    await register(email, password, 'admin');
    const token = await login(email, password);
    const res = await request(app.getHttpServer() as unknown as App)
      .post('/object')
      .set('Authorization', `Bearer ${token}`)
      .send({
        obj_networkMAC: '00:1B:44:11:3A:D2',
        obj_name: 'Obj 2',
        obj_model: 'M',
        obj_brand: 'B',
        obj_function: ['f'],
        obj_restriction: ['r'],
        obj_limitation: ['l'],
        obj_access: 1,
        obj_location: 1,
        obj_qualification: 1,
        obj_status: 1,
      })
      .expect(201);
    expect(res.body._id).toBeDefined();
  });
});
