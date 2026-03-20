import { deleteLocalUser } from '@zero/server/local-accounts';
import { confirm, isCancel, log, text } from '@clack/prompts';
import type { Command } from '.';

export const command: Command = {
  id: 'delete-user',
  description: 'Delete a local account',
  run: async () => {
    const email = await text({
      message: 'Email address',
      placeholder: 'me@example.com',
      validate: (value) => (value.includes('@') ? undefined : 'Enter a valid email'),
    });

    if (isCancel(email)) {
      process.exit(0);
    }

    const approved = await confirm({
      message: `Delete ${email}? This cannot be undone.`,
      initialValue: false,
    });

    if (isCancel(approved) || !approved) {
      process.exit(0);
    }

    const result = await deleteLocalUser({ email });
    log.success(`Deleted ${result.email}.`);
  },
};
