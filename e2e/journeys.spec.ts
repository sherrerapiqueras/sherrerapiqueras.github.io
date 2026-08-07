import { expect, test } from '@playwright/test';

/**
 * The handful of journeys that unit and component tests structurally cannot
 * see: state that survives a reload, navigation between real routes, layout
 * under a real viewport, and the CSP actually permitting the page to work.
 *
 * Deliberately small. E2E rots faster than anything else in the suite, so it
 * only covers what nothing cheaper can.
 */

test.describe('theme', () => {
  test('toggles and survives a reload', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('html');
    const before = await root.getAttribute('data-theme');

    await page.getByRole('button', { name: /theme|tema/i }).click();
    const after = await root.getAttribute('data-theme');
    expect(after).not.toBe(before);

    // The blocking script in <head> must restore it before first paint.
    await page.reload();
    await expect(root).toHaveAttribute('data-theme', after!);
  });

  test('the toggle names the action, not just the current state', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: /theme|tema/i });
    const label = await button.getAttribute('aria-label');
    expect(label).toBeTruthy();

    await button.click();
    // The accessible name has to flip too, or it describes the wrong action.
    await expect(button).not.toHaveAttribute('aria-label', label!);
  });
});

test.describe('language', () => {
  test('switches to Spanish and back, updating the document language', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByRole('link', { name: /español/i }).click();
    await expect(page).toHaveURL(/\/es\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
    await expect(page.getByRole('heading', { name: 'PROYECTOS' })).toBeVisible();

    await page.getByRole('link', { name: /in English/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('each locale declares the other as an alternate', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[hreflang="es"]')).toHaveCount(1);
    await expect(page.locator('link[hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveCount(1);
  });
});

test.describe('navigation', () => {
  for (const section of ['projects', 'stack', 'contact']) {
    test(`the ${section} anchor lands below the header`, async ({ page }) => {
      await page.goto('/');
      await page.locator(`header a[href="#${section}"]`).click();
      await page.waitForTimeout(600); // smooth scroll

      const gap = await page.evaluate((id) => {
        const header = document.querySelector('header')!;
        const target = document.getElementById(id)!;
        const style = getComputedStyle(header);
        // A static header scrolls away, so it cannot overlap anything.
        if (style.position !== 'sticky') return 0;
        return Math.round(
          target.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
        );
      }, section);

      expect(gap, 'section is hidden under the sticky header').toBeGreaterThanOrEqual(0);
    });
  }

  test('the skip link is reachable and targets the content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '#index');
  });
});

test.describe('layout', () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `page scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('release data', () => {
  test('renders a populated release log', async ({ page }) => {
    await page.goto('/');
    const rows = page.locator('[data-release-log] li');
    await expect(rows).toHaveCount(4);

    // Whether live or fallback, every row must be complete.
    for (let i = 0; i < 4; i++) {
      await expect(rows.nth(i).locator('.tag')).not.toBeEmpty();
      await expect(rows.nth(i).locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
      await expect(rows.nth(i).locator('.note')).not.toBeEmpty();
    }
  });

  test('the client refresh never empties the card', async ({ page }) => {
    // Simulate the API being rate limited while the page is open.
    await page.route('**/api.github.com/**', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"limit"}' }),
    );
    await page.goto('/');
    await page.waitForTimeout(800);

    await expect(page.locator('[data-release-log] li')).toHaveCount(4);
    await expect(page.locator('[data-field="version"]')).toHaveText(/^v\d+\.\d+\.\d+/);
  });
});

test.describe('assets', () => {
  test('the CV link resolves and matches the locale', async ({ page, request }) => {
    for (const [path, expected] of [
      ['/', 'cv_sergio_herrera_en.pdf'],
      ['/es/', 'cv_sergio_herrera_es.pdf'],
    ]) {
      await page.goto(path);
      const href = await page.locator('.cta-secondary').getAttribute('href');
      expect(href).toContain(expected);

      const res = await request.get(href!);
      expect(res.status(), `${href} should be served`).toBe(200);
      expect(res.headers()['content-type']).toContain('pdf');
    }
  });

  test('the social preview image exists', async ({ page, request }) => {
    await page.goto('/');
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    const res = await request.get(new URL(og!).pathname);
    expect(res.status()).toBe(200);
  });
});

test.describe('content security policy', () => {
  test('the page runs with no CSP violations', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/content security policy/i.test(msg.text())) violations.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(1200);
    // Exercise the scripts the policy has to permit.
    await page.getByRole('button', { name: /theme|tema/i }).click();

    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  test('the hero canvas actually paints', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);
    const painted = await page.evaluate(() => {
      const c = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return false;
      return ctx.getImageData(0, 0, 80, 80).data.some((v) => v !== 0);
    });
    expect(painted, 'canvas is blank — script blocked or sizing broken').toBe(true);
  });
});
