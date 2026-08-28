import { createClient } from '@vercel/flags-core';

type FlagSource = 'vercel-flags' | 'default';

interface ResolvedFlagValue {
  enabled: boolean;
  source: FlagSource;
  reason?: string;
  errorCode?: string;
  errorMessage?: string;
}

let flagsClientPromise: Promise<ReturnType<typeof createClient>> | null = null;

async function getFlagsClient() {
  if (!process.env.FLAGS) {
    return null;
  }

  flagsClientPromise ??= (async () => {
    const client = createClient(process.env.FLAGS);
    await client.initialize();
    return client;
  })();

  return flagsClientPromise;
}

export async function resolveFlagValue(flagKey: string): Promise<ResolvedFlagValue> {
  const flagsClient = await getFlagsClient();

  if (flagsClient) {
    const result = await flagsClient.evaluate<boolean>(flagKey, false);
    return {
      enabled: Boolean(result.value),
      source: 'vercel-flags',
      reason: result.reason,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    };
  }

  console.warn(
    `[Flags] FLAGS no está configurado. FLAGS_SECRET no permite evaluar "${flagKey}". ` +
    'Retornando false por seguridad.',
  );

  return {
    enabled: false,
    source: 'default',
  };
}
