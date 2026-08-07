import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Makes the accessibility audit permanent.
 *
 * The colour work was verified once by hand — six tokens moved to clear WCAG AA
 * — and a hand-check does not survive the next palette tweak. axe re-runs it on
 * every commit, in both themes and both locales.
 */

const LOCALES = [
  { path: '/', name: 'en' },
  { path: '/es/', name: 'es' },
];

const THEMES = ['dark', 'light'] as const;

/** Force a theme before the page paints, the same way the site's own script does. */
async function setTheme(page: import('@playwright/test').Page, theme: string) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
}

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    test(`${locale.name} / ${theme}: no WCAG A or AA violations`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(locale.path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Report the actual rule and element, not just a count.
      const summary = results.violations.map(
        (v) =>
          `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target).join('\n    ')}`,
      );
      expect(summary, summary.join('\n')).toHaveLength(0);
    });
  }
}

test('colour contrast holds in both themes', async ({ page }) => {
  // Called out separately because this is the one that regressed during design
  // work, and the one a palette change is most likely to break.
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await page.goto('/');
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const failures = results.violations.flatMap((v) =>
      v.nodes.map((n) => `${theme}: ${n.target} — ${n.failureSummary?.split('\n')[1]?.trim()}`),
    );
    expect(failures, failures.join('\n')).toHaveLength(0);
  }
});

test('every image has alternative text', async ({ page }) => {
  await page.goto('/');
  for (const img of await page.locator('img').all()) {
    const alt = await img.getAttribute('alt');
    expect(alt, 'image is missing alt text').not.toBeNull();
    expect(alt!.trim().length, 'alt text is empty').toBeGreaterThan(0);
  }
});

test('the heading order is not skipped', async ({ page }) => {
  await page.goto('/');
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])),
  );
  expect(levels[0], 'page should start at h1').toBe(1);
  for (let i = 1; i < levels.length; i++) {
    expect(
      levels[i] - levels[i - 1],
      `jumped from h${levels[i - 1]} to h${levels[i]}`,
    ).toBeLessThanOrEqual(1);
  }
});

test('interactive elements are reachable and visibly focused', async ({ page }) => {
  await page.goto('/');
  // Tab through the header and confirm focus lands somewhere with an outline.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle };
    });
    if (outline) {
      expect(outline.style, 'focused element has no visible outline').not.toBe('none');
      expect(parseFloat(outline.width)).toBeGreaterThan(0);
    }
  }
});
