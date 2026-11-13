import { describe, expect, it } from 'vitest';
import { ApiError, request } from './api';

const reply = (status: number, body: unknown): typeof fetch => () => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('request', () => {
  it('devuelve el cuerpo y manda el token en Authorization', async () => {
    let seen: Headers | undefined;
    const fetcher: typeof fetch = (_url, init) => {
      seen = new Headers(init?.headers);
      return Promise.resolve(new Response('{"score":3}', { status: 200 }));
    };
    expect(await request<{ score: number }>('/me', { token: 'abc' }, fetcher)).toEqual({ score: 3 });
    expect(seen?.get('Authorization')).toBe('Bearer abc');
  });

  it('traduce el codigo de error del contrato', async () => {
    const error = await request('/players', { method: 'POST', body: {} }, reply(400, { code: 'NICKNAME_NOT_ALLOWED', message: 'x' })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'NICKNAME_NOT_ALLOWED' });
  });

  it('un codigo desconocido o un cuerpo que no es JSON no rompe', async () => {
    expect(await request('/x', {}, reply(500, { code: 'OTRO' })).catch((e: unknown) => e)).toMatchObject({ status: 500, code: null });
    const notJson: typeof fetch = () => Promise.resolve(new Response('<html>', { status: 502 }));
    expect(await request('/x', {}, notJson).catch((e: unknown) => e)).toMatchObject({ status: 502, code: null });
  });

  it('sin red es status 0', async () => {
    const down: typeof fetch = () => Promise.reject(new TypeError('network'));
    expect(await request('/x', {}, down).catch((e: unknown) => e)).toMatchObject({ status: 0 });
  });
});
