import { SettingsLayoutContent } from '@/components/ui/settings-content';
import { Outlet } from 'react-router';
import { authProxy } from '@/lib/auth-proxy';
import { requiresTwoFactorSetup } from '@/lib/two-factor';
import type { Route } from './+types/layout';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await authProxy.api.getSession({ headers: request.headers });
  const loginUrl = new URL('/login', request.url);
  const setupTwoFactorUrl = new URL('/setup-2fa', request.url);

  if (!session) {
    return Response.redirect(loginUrl.toString());
  }

  if (requiresTwoFactorSetup(session)) {
    return Response.redirect(setupTwoFactorUrl.toString());
  }

  return null;
}

export default function SettingsLayout() {
  return (
    <SettingsLayoutContent>
      <Outlet />
    </SettingsLayoutContent>
  );
}
