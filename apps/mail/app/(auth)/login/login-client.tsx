import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { otpProvider, requiresTwoFactorSetup } from '@/lib/two-factor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';

type LoginStage = 'password' | 'two-factor';

export function LoginClient() {
  const [email, setEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [stage, setStage] = useState<LoginStage>('password');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectAfterAuth = async () => {
    const session = await otpProvider.getFreshSession();
    window.location.href = requiresTwoFactorSetup(session) ? '/setup-2fa' : '/mail/inbox';
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await otpProvider.signIn(email, userPassword);

    setIsSubmitting(false);

    if (response.error) {
      setError(response.error.message ?? 'Failed to sign in');
      return;
    }

    if ((response.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      setStage('two-factor');
      return;
    }

    await redirectAfterAuth();
  };

  const handleTwoFactorSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await otpProvider.verifyTotp(otpCode);

    setIsSubmitting(false);

    if (response.error) {
      setError(response.error.message ?? 'Invalid authentication code');
      return;
    }

    await redirectAfterAuth();
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#111111] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-8 shadow-2xl">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-4xl font-bold text-white">ZeroHassle</p>
          <p className="text-sm text-white/60">
            {stage === 'password'
              ? 'Sign in with your private local account'
              : 'Enter the code from your authenticator app'}
          </p>
        </div>

        {error ? (
          <Alert variant="default" className="mb-4 border-orange-500/40 bg-orange-500/10">
            <TriangleAlert className="h-4 w-4 text-orange-400" />
            <AlertTitle className="text-orange-400">Authentication failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {stage === 'password' ? (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-white/70" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                autoComplete="email"
                className="border-white/10 bg-black/40 text-white"
                placeholder="me@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="border-white/10 bg-black/40 text-white"
                placeholder="••••••••"
                value={userPassword}
                onChange={(event) => setUserPassword(event.target.value)}
              />
            </div>

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleTwoFactorSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-white/70" htmlFor="otp-code">
                Authentication code
              </label>
              <Input
                id="otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="border-white/10 bg-black/40 text-white"
                placeholder="123456"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Verifying...' : 'Verify code'}
            </Button>

            <Button
              className="w-full"
              disabled={isSubmitting}
              type="button"
              variant="outline"
              onClick={() => {
                setStage('password');
                setOtpCode('');
                setError(null);
              }}
            >
              Back
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
