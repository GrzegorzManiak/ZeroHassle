export type Command = {
  id: string;
  description: string;
  run: () => Promise<void>;
};

export { command as fixEnv } from './fix-env';
export { command as reinstallNodeModules } from './reinstall-node-modules';
export { command as sync } from './sync';
export { command as createUser } from './create-user';
export { command as setPassword } from './set-password';
export { command as reset2fa } from './reset-2fa';
export { command as deleteUser } from './delete-user';
