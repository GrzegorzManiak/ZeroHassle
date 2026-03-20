import { authClient, getSession } from './auth-client';

type SessionLike = {
  user?: {
    id?: string;
    twoFactorEnabled?: boolean;
  };
} | null;

export const requiresTwoFactorSetup = (session: SessionLike) =>
  Boolean(session?.user?.id && !session.user?.twoFactorEnabled);

export const otpProvider = {
  async signIn(email: string, password: string) {
    return await authClient.signIn.email({
      email,
      password,
      callbackURL: `${window.location.origin}/mail/inbox`,
    });
  },
  async beginSetup(password: string) {
    return await authClient.twoFactor.enable({
      password,
    });
  },
  async verifyTotp(code: string, trustDevice = true) {
    return await authClient.twoFactor.verifyTotp({
      code,
      trustDevice,
    });
  },
  async getFreshSession() {
    const session = await getSession();
    return session.data ?? null;
  },
};
