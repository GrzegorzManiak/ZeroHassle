import HomeContent from '@/components/home/HomeContent';
import { authProxy } from '@/lib/auth-proxy';
import { requiresTwoFactorSetup } from '@/lib/two-factor';
import type { Route } from './+types/page';
import { redirect } from 'react-router';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await authProxy.api.getSession({ headers: request.headers });
  if (session?.user.id) throw redirect(requiresTwoFactorSetup(session) ? '/setup-2fa' : '/mail/inbox');
  return null;
}

export default function Home() {
  return <HomeContent />;
}
