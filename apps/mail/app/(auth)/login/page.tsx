import { LoginClient } from './login-client';
import { authProxy } from '@/lib/auth-proxy';
import { requiresTwoFactorSetup } from '@/lib/two-factor';
import { redirect } from 'react-router';
import type { Route } from './+types/page';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await authProxy.api.getSession({ headers: request.headers });
  if (session?.user?.id) {
    throw redirect(requiresTwoFactorSetup(session) ? '/setup-2fa' : '/mail/inbox');
  }
  return null;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white dark:bg-black">
      <LoginClient />
    </div>
  );
}
