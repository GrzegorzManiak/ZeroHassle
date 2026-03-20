import { setLocalPassword } from '@zero/server/local-accounts';
import { isCancel, log, password, text } from '@clack/prompts';
import type { Command } from '.';

export const command: Command = {
  id: 'set-password',
  description: 'Set or replace a local account password',
  run: async () => {
    const email = await text({
      message: 'Email address',
      placeholder: 'me@example.com',
      validate: (value) => (value.includes('@') ? undefined : 'Enter a valid email'),
    });

    if (isCancel(email)) {
      process.exit(0);
    }

    const userPassword = await password({
      message: 'New password',
      validate: (value) =>
        value.length >= 8 ? undefined : 'Password must be at least 8 characters long',
    });

    if (isCancel(userPassword)) {
      process.exit(0);
    }

    const result = await setLocalPassword({
      email,
      password: userPassword,
    });

    log.success(`Password updated for ${result.email}.`);
  },
};
