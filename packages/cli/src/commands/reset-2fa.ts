import { resetLocalUserTwoFactor } from '@zero/server/local-accounts';
import { isCancel, log, text } from '@clack/prompts';
import type { Command } from '.';

export const command: Command = {
  id: 'reset-2fa',
  description: 'Reset TOTP enrollment for a local account',
  run: async () => {
    const email = await text({
      message: 'Email address',
      placeholder: 'me@example.com',
      validate: (value) => (value.includes('@') ? undefined : 'Enter a valid email'),
    });

    if (isCancel(email)) {
      process.exit(0);
    }

    const result = await resetLocalUserTwoFactor({ email });
    log.success(`TOTP reset for ${result.email}. The next login will require enrollment.`);
  },
};
