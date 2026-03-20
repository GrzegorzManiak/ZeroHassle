import { resetLocalUserTwoFactor, setLocalPassword } from '@zero/server/local-accounts';
import { test, expect } from '@playwright/test';

test.describe('Local authentication', () => {
  test('requires TOTP enrollment after password login when 2FA is reset', async ({ browser }) => {
    const email = process.env.PLAYWRIGHT_EMAIL ?? process.env.EMAIL;
    const password = process.env.PLAYWRIGHT_PASSWORD ?? 'ZeroHassle123!';

    if (!email) {
      throw new Error('PLAYWRIGHT_EMAIL or EMAIL must be set.');
    }

    await setLocalPassword({ email, password });
    await resetLocalUserTwoFactor({ email });

    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/setup-2fa$/);
    await expect(page.getByText('Set up two-factor authentication')).toBeVisible();

    await context.close();
  });
});
