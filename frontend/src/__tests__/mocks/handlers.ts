import { http, HttpResponse } from 'msw';

const fakePayload = Buffer.from(
  JSON.stringify({ sub: '1', email: 'test@example.com', roles: ['ADMIN'], permissions: ['users:read'] }),
).toString('base64');
const fakeAccessToken = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.sig`;

export const handlers = [
  http.post('http://localhost/api/auth/login', () =>
    HttpResponse.json({ accessToken: fakeAccessToken, refreshToken: 'fake-refresh' }),
  ),

  http.get('http://localhost/api/users', () =>
    HttpResponse.json({
      data: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'active',
          roles: ['ADMIN'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    }),
  ),

  http.get('http://localhost/api/roles', () => HttpResponse.json([])),
];
