import { defaultUserSettings } from './schemas';
import { getBrowserTimezone, isValidTimezone } from './timezones';
import { createDb } from '../db';
import { account, twoFactor, user, userSettings } from '../db/schema';
import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';

type RootDbClient = ReturnType<typeof createDb>['db'];
type TransactionClient = Parameters<Parameters<RootDbClient['transaction']>[0]>[0];
type DbClient = RootDbClient | TransactionClient;

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to manage local accounts');
  }

  return databaseUrl;
};

const createNodeDb = () => createDb(getDatabaseUrl());

export const buildDefaultUserSettings = (timezone?: string) => ({
  ...defaultUserSettings,
  timezone:
    timezone && isValidTimezone(timezone)
      ? timezone
      : isValidTimezone(getBrowserTimezone())
        ? getBrowserTimezone()
        : 'UTC',
});

export const ensureDefaultUserSettings = async (
  db: DbClient,
  userId: string,
  timezone?: string,
) => {
  const existingSettings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (existingSettings) {
    return existingSettings;
  }

  const now = new Date();
  const [created] = await db
    .insert(userSettings)
    .values({
      id: crypto.randomUUID(),
      userId,
      settings: buildDefaultUserSettings(timezone),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
};

const inferNameFromEmail = (email: string) => {
  const [localPart] = email.split('@');
  return localPart || email;
};

export const createLocalUser = async ({
  email,
  password,
  name,
  timezone,
}: {
  email: string;
  password: string;
  name?: string;
  timezone?: string;
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const { db, conn } = createNodeDb();

  try {
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, normalizedEmail),
    });

    if (existingUser) {
      throw new Error(`User already exists for ${normalizedEmail}`);
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const userId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: name?.trim() || inferNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
        defaultConnectionId: null,
        customPrompt: null,
        twoFactorEnabled: false,
      });

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: passwordHash,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: now,
        updatedAt: now,
      });

      await ensureDefaultUserSettings(tx, userId, timezone);
    });

    return { id: userId, email: normalizedEmail };
  } finally {
    await conn.end();
  }
};

export const setLocalPassword = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const { db, conn } = createNodeDb();

  try {
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, normalizedEmail),
    });

    if (!existingUser) {
      throw new Error(`User not found for ${normalizedEmail}`);
    }

    const existingAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, existingUser.id), eq(account.providerId, 'credential')),
    });
    const passwordHash = await hashPassword(password);
    const now = new Date();

    if (!existingAccount) {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: existingUser.id,
        providerId: 'credential',
        userId: existingUser.id,
        password: passwordHash,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(account)
        .set({
          password: passwordHash,
          updatedAt: now,
        })
        .where(eq(account.id, existingAccount.id));
    }

    return { id: existingUser.id, email: normalizedEmail };
  } finally {
    await conn.end();
  }
};

export const resetLocalUserTwoFactor = async ({ email }: { email: string }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const { db, conn } = createNodeDb();

  try {
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, normalizedEmail),
    });

    if (!existingUser) {
      throw new Error(`User not found for ${normalizedEmail}`);
    }

    await db.transaction(async (tx) => {
      await tx.delete(twoFactor).where(eq(twoFactor.userId, existingUser.id));
      await tx
        .update(user)
        .set({
          twoFactorEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(user.id, existingUser.id));
    });

    return { id: existingUser.id, email: normalizedEmail };
  } finally {
    await conn.end();
  }
};

export const deleteLocalUser = async ({ email }: { email: string }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const { db, conn } = createNodeDb();

  try {
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, normalizedEmail),
    });

    if (!existingUser) {
      throw new Error(`User not found for ${normalizedEmail}`);
    }

    await db.delete(user).where(eq(user.id, existingUser.id));

    return { id: existingUser.id, email: normalizedEmail };
  } finally {
    await conn.end();
  }
};
