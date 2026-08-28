import { get } from '@vercel/edge-config';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  // /api/edge-config/[key] → último segmento es la key
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
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error(`[EdgeConfig] Error fetching key "${key}":`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to read Edge Config' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

