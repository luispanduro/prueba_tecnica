import { http, HttpResponse } from 'msw';

const fakePayload = Buffer.from(
  JSON.stringify({ sub: '1', email: 'test@example.com', roles: ['ADMIN'], permissions: ['users:read'] }),
).toString('base64');
const fakeAccessToken = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.sig`;

export const handlers = [
  http.post('/api/auth/login', () =>
    HttpResponse.json({ accessToken: fakeAccessToken, refreshToken: 'fake-refresh' }),
  ),

  http.get('/api/users', () =>
    HttpResponse.json({
      data: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'active',
          roles: ['ADMIN'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    }),
  ),

  http.get('/api/roles', () => HttpResponse.json([])),
];
