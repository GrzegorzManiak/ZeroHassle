import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authProxy } from '@/lib/auth-proxy';
import { otpProvider, requiresTwoFactorSetup } from '@/lib/two-factor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { redirect } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import type { Route } from './+types/page';

const getSecretFromUri = (totpURI: string) => {
  try {
    return new URL(totpURI).searchParams.get('secret') ?? '';
  } catch {
    return '';
  }
};

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await authProxy.api.getSession({ headers: request.headers });

  if (!session?.user?.id) {
    throw redirect('/login');
  }

  if (!requiresTwoFactorSetup(session)) {
    throw redirect('/mail/inbox');
  }

  return {
    email: session.user.email,
  };
}

export default function SetupTwoFactorPage({ loaderData }: Route.ComponentProps) {
  const [userPassword, setUserPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [totpURI, setTotpURI] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQrCode, setIsGeneratingQrCode] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const secret = useMemo(() => getSecretFromUri(totpURI), [totpURI]);

  useEffect(() => {
    let active = true;

    if (!totpURI) {
      setQrCodeDataUrl('');
      setQrError(null);
      setIsGeneratingQrCode(false);
      return;
    }

    setIsGeneratingQrCode(true);
    setQrError(null);

    void import('qrcode')
      .then(({ toDataURL }) =>
        toDataURL(totpURI, {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 8,
          color: {
            dark: '#111111',
            light: '#FFFFFF',
          },
        }),
      )
      .then((dataUrl) => {
        if (!active) {
          return;
        }

        setQrCodeDataUrl(dataUrl);
        setIsGeneratingQrCode(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setQrCodeDataUrl('');
        setQrError('QR code generation failed. Use manual setup instead.');
        setIsGeneratingQrCode(false);
      });

    return () => {
      active = false;
    };
  }, [totpURI]);

  const beginSetup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setQrError(null);
    setIsSubmitting(true);

    const response = await otpProvider.beginSetup(userPassword);

    setIsSubmitting(false);

    if (response.error) {
      setError(response.error.message ?? 'Failed to start TOTP setup');
      return;
    }

    setTotpURI(response.data?.totpURI ?? '');
    setBackupCodes(response.data?.backupCodes ?? []);
    setShowManualSetup(false);
    setShowBackupCodes(false);
  };

  const completeSetup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await otpProvider.verifyTotp(otpCode);

    setIsSubmitting(false);

    if (response.error) {
      setError(response.error.message ?? 'Invalid authentication code');
      return;
    }

    window.location.href = '/mail/inbox';
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#111111] px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/30 p-8 shadow-2xl">
        <div className="mb-6 space-y-2">
          <p className="text-3xl font-bold text-white">Set up two-factor authentication</p>
          <p className="text-sm text-white/60">
            This private install only allows local accounts with TOTP enabled.
          </p>
          <p className="text-sm text-white/40">Signed in as {loaderData.email}</p>
        </div>

        {error ? (
          <Alert variant="default" className="mb-4 border-orange-500/40 bg-orange-500/10">
            <AlertTitle className="text-orange-400">Setup failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!totpURI ? (
          <form className="space-y-4" onSubmit={beginSetup}>
            <div className="space-y-2">
              <label className="text-sm text-white/70" htmlFor="setup-password">
                Current password
              </label>
              <Input
                id="setup-password"
                type="password"
                autoComplete="current-password"
                className="border-white/10 bg-black/40 text-white"
                placeholder="••••••••"
                value={userPassword}
                onChange={(event) => setUserPassword(event.target.value)}
              />
            </div>

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Preparing...' : 'Generate authenticator secret'}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5" data-testid="totp-setup">
              <p className="text-sm font-medium text-white">Scan with your authenticator app</p>
              <p className="mt-2 text-xs text-white/55">
                Use any TOTP app to scan this QR code, then confirm with the 6-digit code it
                generates.
              </p>

              <div className="mt-4 flex justify-center">
                <div className="flex min-h-56 w-full max-w-56 items-center justify-center rounded-3xl bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Authenticator QR code"
                      className="h-full w-full rounded-2xl"
                    />
                  ) : (
                    <div className="space-y-2 px-4 text-center">
                      <p className="text-sm font-medium text-black">
                        {isGeneratingQrCode ? 'Generating QR code...' : 'QR code unavailable'}
                      </p>
                      <p className="text-xs text-black/60">
                        {isGeneratingQrCode
                          ? 'Keep this tab open for a moment.'
                          : 'Use manual setup instead.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {qrError ? <p className="mt-3 text-xs text-orange-300">{qrError}</p> : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setShowManualSetup((current) => !current)}
                >
                  {showManualSetup ? 'Hide manual setup details' : 'Show manual setup details'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setShowBackupCodes((current) => !current)}
                >
                  {showBackupCodes ? 'Hide backup codes' : 'Show backup codes'}
                </Button>
              </div>
            </div>

            {showManualSetup ? (
              <div
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
                data-testid="totp-manual-setup"
                data-totp-uri={totpURI}
              >
                <p className="text-sm font-medium text-white">Manual setup details</p>
                <p className="mt-2 break-all font-mono text-sm text-white/80">{secret}</p>
                <p className="mt-3 text-xs text-white/50">
                  If scanning is not available, create a TOTP entry manually with this secret or
                  the `otpauth://` URI below.
                </p>
                <p className="mt-2 break-all font-mono text-xs text-white/35">{totpURI}</p>
              </div>
            ) : null}

            {showBackupCodes ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm font-medium text-white">Backup codes</p>
                <p className="mt-2 text-xs text-white/55">
                  Store these offline. Each code can be used once if you lose access to your
                  authenticator.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {backupCodes.map((code) => (
                    <div
                      key={code}
                      className="rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white/80"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium text-white">Next step</p>
              <p className="mt-2 text-sm text-white/60">
                After scanning, enter the current 6-digit code from your authenticator to finish
                setup.
              </p>
            </div>

            <form className="space-y-4" onSubmit={completeSetup}>
              <div className="space-y-2">
                <label className="text-sm text-white/70" htmlFor="verification-code">
                  Verification code
                </label>
                <Input
                  id="verification-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="border-white/10 bg-black/40 text-white"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(event) =>
                    setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                />
              </div>

              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Finishing setup...' : 'Enable TOTP'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
