import { createLocalUser, resetLocalUserTwoFactor, setLocalPassword } from '@zero/server/local-accounts';
import { createHmac } from 'crypto';
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

const decodeBase32 = (input: string) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';

  for (const char of normalized) {
    const value = alphabet.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

const generateTotpCode = (totpUri: string) => {
  const parsed = new URL(totpUri);
  const secret = parsed.searchParams.get('secret');

  if (!secret) {
    throw new Error('TOTP URI is missing a secret');
  }

  const digits = Number.parseInt(parsed.searchParams.get('digits') ?? '6', 10);
  const period = Number.parseInt(parsed.searchParams.get('period') ?? '30', 10);
  const algorithm = (parsed.searchParams.get('algorithm') ?? 'SHA1').toLowerCase();
  const counter = Math.floor(Date.now() / 1000 / period);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac(algorithm, decodeBase32(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
};

setup('sign in with local credentials and enroll TOTP', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL ?? process.env.EMAIL;
  const password = process.env.PLAYWRIGHT_PASSWORD ?? 'ZeroHassle123!';

  if (!email) {
    throw new Error('PLAYWRIGHT_EMAIL or EMAIL must be set.');
  }

  try {
    await setLocalPassword({ email, password });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('User not found')) {
      await createLocalUser({
        email,
        password,
        name: 'Playwright User',
      });
    } else {
      throw error;
    }
  }

  await resetLocalUserTwoFactor({ email });

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/setup-2fa$/);

  await page.getByLabel('Current password').fill(password);
  await page.getByRole('button', { name: 'Generate authenticator secret' }).click();

  const setupBox = page.getByTestId('totp-setup');
  await expect(setupBox).toBeVisible();

  await page.getByRole('button', { name: 'Show manual setup details' }).click();

  const manualSetupBox = page.getByTestId('totp-manual-setup');
  await expect(manualSetupBox).toBeVisible();

  const totpUri = await manualSetupBox.getAttribute('data-totp-uri');

  if (!totpUri) {
    throw new Error('TOTP setup URI was not rendered');
  }

  await page.getByLabel('Verification code').fill(generateTotpCode(totpUri));
  await page.getByRole('button', { name: 'Enable TOTP' }).click();

  await expect(page).toHaveURL(/\/mail\/inbox/);

  await page.context().storageState({ path: authFile });
});
