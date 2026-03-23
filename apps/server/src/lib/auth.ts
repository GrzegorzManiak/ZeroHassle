import { type Account, betterAuth, type BetterAuthOptions } from 'better-auth';
import { getBrowserTimezone, isValidTimezone } from './timezones';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt, bearer, twoFactor } from 'better-auth/plugins';
import { ensureDefaultUserSettings } from './local-accounts';
import { getZeroDB, resetConnection } from './server-utils';
import { getSocialProviders } from './auth-providers';
import { ensureLocalMailbox } from './local-mailbox';
import { APIError } from 'better-auth/api';
import { type EProviders } from '../types';
import { createDriver } from './driver';
import { redis } from './services';
import { createDb } from '../db';
import { env } from '../env';

const LOCAL_DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const normalizeOrigin = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const isLocalDevOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && LOCAL_DEV_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
};

const getRequestOrigins = (request?: Request) => {
  if (!request || env.NODE_ENV === 'production') {
    return [];
  }

  return [request.headers.get('origin'), request.headers.get('referer')]
    .map((value) => normalizeOrigin(value))
    .filter((value): value is string => Boolean(value))
    .filter(isLocalDevOrigin);
};

const buildTrustedOrigins = (request?: Request) => {
  const configuredOrigins = [
    env.VITE_PUBLIC_APP_URL,
    env.VITE_PUBLIC_BACKEND_URL,
    env.BETTER_AUTH_URL,
    env.BETTER_AUTH_TRUSTED_ORIGINS,
    'https://app.0.email',
    'https://sapi.0.email',
    'https://staging.0.email',
    'https://0.email',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
  ]
    .flatMap((value) => value?.split(',') ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...configuredOrigins, ...getRequestOrigins(request)])];
};

const connectionHandlerHook = async (account: Account) => {
  if (account.providerId !== 'google') {
    return;
  }

  if (!account.accessToken || !account.refreshToken) {
    console.error('Missing Access/Refresh Tokens', { account });
    throw new APIError('EXPECTATION_FAILED', {
      message: 'Missing Access/Refresh Tokens',
    });
  }

  const driver = createDriver(account.providerId, {
    auth: {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      userId: account.userId,
      email: '',
    },
  });

  const userInfo = await driver.getUserInfo().catch(async () => {
    if (account.accessToken) {
      await driver.revokeToken(account.accessToken);
      await resetConnection(account.id);
    }
    throw new Response(null, { status: 301, headers: { Location: '/' } });
  });

  if (!userInfo?.address) {
    try {
      await Promise.allSettled(
        [account.accessToken, account.refreshToken]
          .filter(Boolean)
          .map((t) => driver.revokeToken(t as string)),
      );
      await resetConnection(account.id);
    } catch (error) {
      console.error('Failed to revoke tokens:', error);
    }
    throw new Response(null, { status: 303, headers: { Location: '/' } });
  }

  const updatingInfo = {
    name: userInfo.name || 'Unknown',
    picture: userInfo.photo || '',
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    scope: driver.getScope(),
    expiresAt: new Date(Date.now() + (account.accessTokenExpiresAt?.getTime() || 3600000)),
  };

  const db = await getZeroDB(account.userId);
  const [result] = await db.createConnection(
    account.providerId as EProviders,
    userInfo.address,
    updatingInfo,
  );

  if (env.GOOGLE_S_ACCOUNT && env.GOOGLE_S_ACCOUNT !== '{}') {
    await env.subscribe_queue.send({
      connectionId: result.id,
      providerId: account.providerId,
    });
  }
};

export const createAuth = () => {
  return betterAuth({
    plugins: [
      jwt(),
      bearer(),
      twoFactor({
        issuer: 'ZeroHassle',
        totpOptions: {
          digits: 6,
          period: 30,
        },
      }),
    ],
    user: {
      deleteUser: {
        enabled: false,
        beforeDelete: async (user) => {
          const db = await getZeroDB(user.id);
          const connections = await db.findManyConnections();

          const revokedAccounts = (
            await Promise.allSettled(
              // @ts-expect-error
              connections.map(async (connection) => {
                if (!connection.accessToken || !connection.refreshToken) return false;
                const driver = createDriver(connection.providerId, {
                  auth: {
                    accessToken: connection.accessToken,
                    refreshToken: connection.refreshToken,
                    userId: user.id,
                    email: connection.email,
                  },
                });
                const token = connection.refreshToken;
                return await driver.revokeToken(token || '');
              }),
            )
          ).map((result) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            return false;
          });

          if (!revokedAccounts.every((value) => !!value)) {
            console.log('Failed to revoke some accounts');
          }

          await db.deleteUser();
        },
      },
    },
    databaseHooks: {
      account: {
        create: {
          after: connectionHandlerHook,
        },
        update: {
          after: connectionHandlerHook,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: false,
    },
    hooks: {
      after: async (ctx: any) => {
        const newSession = ctx.context.newSession;
        if (!newSession) {
          return;
        }

        const { db } = createDb(env.HYPERDRIVE.connectionString);
        const headerTimezone = ctx.headers?.get('x-vercel-ip-timezone');
        const timezone =
          headerTimezone && isValidTimezone(headerTimezone) ? headerTimezone : getBrowserTimezone();

        await ensureDefaultUserSettings(db, newSession.user.id, timezone);

        const shouldCreateLocalMailbox =
          !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || env.NODE_ENV === 'local';

        if (shouldCreateLocalMailbox) {
          await ensureLocalMailbox({
            db,
            userId: newSession.user.id,
            name: newSession.user.name,
          });
        }
      },
    },
    ...createAuthConfig(),
  });
};

const createAuthConfig = () => {
  const cache = redis();
  const { db } = createDb(env.HYPERDRIVE.connectionString);
  return {
    database: drizzleAdapter(db, { provider: 'pg' }),
    secondaryStorage: {
      get: async (key: string) => {
        const value = await cache.get(key);
        return typeof value === 'string' ? value : value ? JSON.stringify(value) : null;
      },
      set: async (key: string, value: string, ttl?: number) => {
        if (ttl) await cache.set(key, value, { ex: ttl });
        else await cache.set(key, value);
      },
      delete: async (key: string) => {
        await cache.del(key);
      },
    },
    advanced: {
      ipAddress: {
        disableIpTracking: true,
      },
      cookiePrefix: env.NODE_ENV === 'development' ? 'better-auth-dev' : 'better-auth',
      crossSubDomainCookies: {
        enabled: true,
        domain: env.COOKIE_DOMAIN,
      },
    },
    baseURL: env.VITE_PUBLIC_BACKEND_URL,
    trustedOrigins: (request) => buildTrustedOrigins(request),
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      },
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 3, // 1 day (every 1 day the session expiration is updated)
    },
    socialProviders: getSocialProviders(env as unknown as Record<string, string>),
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: false,
        trustedProviders: ['google'],
      },
    },
    onAPIError: {
      onError: (error) => {
        console.error('API Error', error);
      },
      errorURL: `${env.VITE_PUBLIC_APP_URL}/login`,
      throw: true,
    },
  } satisfies BetterAuthOptions;
};

export const createSimpleAuth = () => {
  return betterAuth(createAuthConfig());
};

export type Auth = ReturnType<typeof createAuth>;
export type SimpleAuth = ReturnType<typeof createSimpleAuth>;
