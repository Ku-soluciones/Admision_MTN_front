import { get, set } from '@vercel/edge-config';

export const config = { runtime: 'edge' };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const key = segments[segments.length - 1];

  if (!key) {
    return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const value = await get(key);
    if (value === undefined) {
      return new Response(JSON.stringify({ error: `Key "${key}" not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to read Edge Config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const key = segments[segments.length - 1];

  if (!key) {
    return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    await set(key, body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update Edge Config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
