import { authProxy } from '@/lib/auth-proxy';
import type { Route } from './+types/page';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await authProxy.api.getSession({ headers: request.headers });
  const url = new URL(request.url);

  if (!session) {
    return Response.redirect(new URL('/login', url).toString());
  }

  const params = Object.fromEntries(url.searchParams.entries()) as {
    to?: string;
    subject?: string;
    body?: string;
  };
  const toParam = params.to || 'someone@someone.com';
  const redirectUrl = new URL('/mail/inbox', url);
  redirectUrl.searchParams.set('isComposeOpen', 'true');
  redirectUrl.searchParams.set('to', toParam);

  if (params.subject) {
    redirectUrl.searchParams.set('subject', params.subject);
  }

  return Response.redirect(redirectUrl.toString());
}

// export async function generateMetadata({ searchParams }: any) {
//   // Need to await searchParams in Next.js 15+
//   const params = await searchParams;

//   const toParam = params.to || 'someone';

//   // Create common metadata properties
//   const title = `Email ${toParam} on Zero`;
//   const description = 'Zero - The future of email is here';
//   const imageUrl = `/og-api/create?to=${encodeURIComponent(toParam)}${params.subject ? `&subject=${encodeURIComponent(params.subject)}` : ''}`;

//   // Create metadata object
//   return {
//     title,
//     description,
//     openGraph: {
//       title,
//       description,
//       images: [imageUrl],
//     },
//     twitter: {
//       card: 'summary_large_image',
//       title,
//       description,
//       images: [imageUrl],
//     },
//   };
// }
