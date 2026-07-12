import { expect, type Page, test } from '@playwright/test';

function watchRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText;
    if (request.resourceType() === 'image' || failure === 'net::ERR_ABORTED') return;
    errors.push(`request: ${request.method()} ${request.url()} ${failure}`);
  });
  return errors;
}

async function login(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sales Intelligence' })).toBeVisible();
  await page.locator('form button[type="submit"], form button').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

async function expectNoBodyOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe('desktop business flows', () => {
  test('loads every primary collection without browser errors', async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await login(page);

    const pages = [
      ['/customers', 'Manage Customer'],
      ['/conversations', 'Transactions'],
      ['/insights', 'Insight Collection'],
      ['/employees', 'Employee Profiles'],
      ['/integrations/telegram', 'Telegram Setup'],
      ['/reports', 'Business Reports'],
    ] as const;

    for (const [href, title] of pages) {
      await page.goto(href);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page.locator('text=Loading data')).toHaveCount(0);
      await expectNoBodyOverflow(page);
    }

    expect(errors).toEqual([]);
  });

  test('opens customer, insight, employee and workflow details', async ({ page }, testInfo) => {
    const errors = watchRuntimeErrors(page);
    await login(page);

    await page.goto('/customers');
    const customerLink = page.locator('tbody a[href^="/customers/"]').first();
    await expect(customerLink).toBeVisible();
    await customerLink.click();
    await expect(page.locator('main h2').filter({ hasText: /^\d+\./ })).toHaveCount(9);
    await expectNoBodyOverflow(page);

    await page.goto('/insights');
    const insightLink = page.locator('a[href^="/insights/"]').first();
    await expect(insightLink).toBeVisible();
    await insightLink.click();
    await expect(page.getByText('References', { exact: false })).toBeVisible();
    const analysisToggle = page.locator('section button.btn-secondary').first();
    await analysisToggle.click();
    await expect(page.locator('section dl')).toBeVisible();

    await page.goto('/employees');
    const employeeLink = page.locator('a[href^="/employees/"]').first();
    await expect(employeeLink).toBeVisible();
    await employeeLink.click();
    await expect(page.locator('main')).toContainText('Experience');

    await page.goto('/conversations');
    const workflowLink = page.locator('tbody a[href$="/workflow"]').first();
    await expect(workflowLink).toBeVisible();
    await workflowLink.click();
    await expect(page.locator('.react-flow__node')).not.toHaveCount(0);
    await expect(page.locator('.react-flow__edge')).not.toHaveCount(0);
    const flowBox = await page.locator('.react-flow').boundingBox();
    expect(flowBox?.width).toBeGreaterThan(testInfo.project.name === 'mobile-chrome' ? 300 : 500);
    expect(flowBox?.height).toBeGreaterThan(500);
    await page.locator('.react-flow__node').first().click();
    await expect(page.getByText('Message reference', { exact: true })).toBeVisible();

    expect(errors).toEqual([]);
  });
});

test.describe('mobile navigation', () => {
  test('keeps navigation and collections usable on a phone viewport', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-chrome', 'Mobile navigation only');
    const errors = watchRuntimeErrors(page);
    await login(page);
    await expectNoBodyOverflow(page);

    const destinations = [
      ['/customers', 'Manage Customer', 'Manage Customer'],
      ['/conversations', 'Transactions', 'Transactions'],
      ['/insights', 'Insight Collection', 'Insights'],
      ['/employees', 'Employee Profiles', 'Employee Profiles'],
      ['/reports', 'Business Reports', 'Daily Reports'],
    ] as const;

    for (const [href, title, navLabel] of destinations) {
      await page.locator('header button').first().click();
      const navLink = page.locator('aside').getByRole('link', { name: navLabel, exact: true });
      await expect(navLink).toBeVisible();
      await expect(navLink).toHaveAttribute('href', href);
      await navLink.click();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expectNoBodyOverflow(page);
    }

    expect(errors).toEqual([]);
  });
});
