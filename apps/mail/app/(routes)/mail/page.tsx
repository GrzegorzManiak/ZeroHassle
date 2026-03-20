import type { Route } from './+types/page';

export function clientLoader({ request }: Route.ClientLoaderArgs) {
  return Response.redirect(new URL('/mail/inbox', request.url).toString());
}
