import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateEmail } from '@/components/create/create-email';
import { authProxy } from '@/lib/auth-proxy';
import { useLoaderData } from 'react-router';
import type { Route } from './+types/page';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await authProxy.api.getSession({ headers: request.headers });
  const url = new URL(request.url);

  if (!session) {
    return Response.redirect(new URL('/login', url).toString());
  }

  if (url.searchParams.get('to')?.startsWith('mailto:')) {
    const handleMailtoUrl = new URL('/mail/compose/handle-mailto', url);
    handleMailtoUrl.searchParams.set('mailto', url.searchParams.get('to') ?? '');
    return Response.redirect(handleMailtoUrl.toString());
  }

  return Object.fromEntries(url.searchParams.entries()) as {
    to?: string;
    subject?: string;
    body?: string;
    draftId?: string;
    cc?: string;
    bcc?: string;
  };
}

export default function ComposePage() {
  const params = useLoaderData<typeof clientLoader>();

  return (
    <Dialog open={true}>
      <DialogTitle></DialogTitle>
      <DialogDescription></DialogDescription>
      <DialogTrigger></DialogTrigger>
      <DialogContent className="h-screen w-screen max-w-none border-none bg-[#FAFAFA] p-0 shadow-none dark:bg-[#141414]">
        <CreateEmail
          initialTo={params.to || ''}
          initialSubject={params.subject || ''}
          initialBody={params.body || ''}
          initialCc={params.cc || ''}
          initialBcc={params.bcc || ''}
          draftId={params.draftId || null}
        />
      </DialogContent>
    </Dialog>
  );
}
