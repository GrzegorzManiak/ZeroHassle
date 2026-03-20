import { createLocalUser } from '@zero/server/local-accounts';
import { isCancel, log, password, text } from '@clack/prompts';
import type { Command } from '.';

export const command: Command = {
  id: 'create-user',
  description: 'Create a local account',
  run: async () => {
    const email = await text({
      message: 'Email address',
      placeholder: 'me@example.com',
      validate: (value) => (value.includes('@') ? undefined : 'Enter a valid email'),
    });

    if (isCancel(email)) {
      process.exit(0);
    }

    const name = await text({
      message: 'Display name',
      placeholder: 'Greg',
      defaultValue: '',
    });

    if (isCancel(name)) {
      process.exit(0);
    }

    const userPassword = await password({
      message: 'Password',
      validate: (value) =>
        value.length >= 8 ? undefined : 'Password must be at least 8 characters long',
    });

    if (isCancel(userPassword)) {
      process.exit(0);
    }

    const result = await createLocalUser({
      email,
      name: name || undefined,
      password: userPassword,
    });

    log.success(`Created ${result.email}. First login will require TOTP enrollment.`);
  },
};
