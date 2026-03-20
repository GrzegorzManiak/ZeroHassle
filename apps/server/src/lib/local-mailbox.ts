import { connection, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DB } from '../db';
import { getZeroAgent } from './server-utils';

export const LOCAL_MAILBOX_SCOPE = 'local:test';

export const isLocalMailboxScope = (scope?: string | null) =>
  typeof scope === 'string' && scope.startsWith(LOCAL_MAILBOX_SCOPE);

const buildLocalMailboxAddress = (userId: string) =>
  `local+${userId.slice(0, 8)}@zerohassle.local`;

export const ensureLocalMailbox = async ({
  db,
  userId,
  name,
}: {
  db: DB;
  userId: string;
  name?: string | null;
}) => {
  const existingConnections = await db.query.connection.findMany({
    where: eq(connection.userId, userId),
  });

  const realConnection = existingConnections.find((item) => !isLocalMailboxScope(item.scope));
  if (realConnection) {
    return realConnection;
  }

  const existingLocalConnection = existingConnections.find((item) => isLocalMailboxScope(item.scope));
  const now = new Date();
  const mailboxAddress = buildLocalMailboxAddress(userId);

  const localConnection =
    existingLocalConnection ??
    (
      await db
        .insert(connection)
        .values({
          id: crypto.randomUUID(),
          userId,
          email: mailboxAddress,
          name: name?.trim() || 'Local mailbox',
          picture: '',
          accessToken: 'local-access-token',
          refreshToken: 'local-refresh-token',
          scope: LOCAL_MAILBOX_SCOPE,
          providerId: 'zerohassle-dev',
          expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365 * 10),
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    )[0];

  const foundUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      defaultConnectionId: true,
    },
  });

  if (!foundUser?.defaultConnectionId) {
    await db
      .update(user)
      .set({
        defaultConnectionId: localConnection.id,
        updatedAt: now,
      })
      .where(eq(user.id, userId));
  }

  await (await getZeroAgent(localConnection.id)).stub.seedLocalMailbox({
    ownerEmail: localConnection.email,
    ownerName: localConnection.name ?? 'Local mailbox',
  });

  return localConnection;
};
