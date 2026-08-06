// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshAll, refreshCard } from '../src/lib/refresh-releases';

/**
 * The client refresh runs against a page that is already correct. So the bar is
 * not "does it update" but "can it ever make things worse" — every failure must
 * leave the server-rendered markup byte-for-byte intact, and no release note may
 * ever reach the DOM as markup.
 */

const SCOPE = 'data-astro-cid-abc123';

/** Mirrors what ProjectCard.astro emits, including Astro's scoping attribute. */
function buildCard(slug = 'owner/repo'): HTMLElement {
  document.body.innerHTML = `
    <article data-project="${slug}" ${SCOPE}>
      <span data-field="version" ${SCOPE}>v1.0.0</span>
      <span data-field="lastShip" ${SCOPE}>2026-01-01</span>
      <span data-field="releaseCount" ${SCOPE}>7</span>
      <ul data-release-log ${SCOPE}>
        <li ${SCOPE}>
          <span class="tag" ${SCOPE}>v1.0.0</span>
          <span class="date" ${SCOPE}><time datetime="2026-01-01" ${SCOPE}>2026-01-01</time></span>
          <span class="note" ${SCOPE}>original note</span>
        </li>
      </ul>
    </article>`;
  return document.querySelector('[data-project]')!;
}

const release = (over: Record<string, unknown> = {}) => ({
  tag_name: 'v9.9.9',
  published_at: '2026-08-04T10:11:12Z',
  body: '* fresh note',
  draft: false,
  prerelease: false,
  ...over,
});

const respond = (payload: unknown, ok = true, status = 200) =>
  vi.fn(async () => ({ ok, status, json: async () => payload }) as unknown as Response);

let card: HTMLElement;
let before: string;

beforeEach(() => {
  card = buildCard();
  before = card.innerHTML;
});

afterEach(() => vi.unstubAllGlobals());

describe('refreshCard — success', () => {
  it('updates version, last ship and release count', async () => {
    await refreshCard(card, respond([release()]));
    expect(card.querySelector('[data-field="version"]')!.textContent).toBe('v9.9.9');
    expect(card.querySelector('[data-field="lastShip"]')!.textContent).toBe('2026-08-04');
    expect(card.querySelector('[data-field="releaseCount"]')!.textContent).toBe('1');
  });

  it('rewrites the log rows', async () => {
    const list = [
      release({ tag_name: 'v3.0.0', body: '* three' }),
      release({ tag_name: 'v2.0.0' }),
    ];
    await refreshCard(card, respond(list));
    const rows = card.querySelectorAll('[data-release-log] li');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.tag')!.textContent).toBe('v3.0.0');
    expect(rows[0].querySelector('.note')!.textContent).toBe('three');
  });

  it("keeps Astro's scoping attribute on cloned rows", async () => {
    // Regression: rows built with createElement lack data-astro-cid-* and
    // render completely unstyled the moment real data arrives.
    await refreshCard(card, respond([release(), release({ tag_name: 'v8.0.0' })]));
    for (const row of card.querySelectorAll('[data-release-log] li')) {
      expect(row.hasAttribute(SCOPE)).toBe(true);
      expect(row.querySelector('.tag')!.hasAttribute(SCOPE)).toBe(true);
    }
  });

  it('keeps the time element machine-readable', async () => {
    await refreshCard(card, respond([release()]));
    const time = card.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2026-08-04');
    expect(time.textContent).toBe('2026-08-04');
  });

  it('requests the expected URL without credentials', async () => {
    const spy = respond([release()]);
    await refreshCard(card, spy);
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/owner/repo/releases?per_page=100');
    expect(init.headers).toEqual({ Accept: 'application/vnd.github+json' });
    expect(JSON.stringify(init)).not.toMatch(/authorization/i);
  });
});

describe('refreshCard — failures leave the page untouched', () => {
  /*
   * The non-2xx cases return a body that would be perfectly acceptable on a
   * 200. With an empty body they passed even with the `res.ok` check deleted,
   * because the payload got rejected further down — green for the wrong
   * reason. A proxy serving stale JSON with a 5xx is why the check exists.
   */
  const cases: Array<[string, () => typeof fetch]> = [
    ['403 rate limited', () => respond([release()], false, 403) as unknown as typeof fetch],
    ['404 repo gone', () => respond([release()], false, 404) as unknown as typeof fetch],
    ['500 server error', () => respond([release()], false, 500) as unknown as typeof fetch],
    ['empty release list', () => respond([]) as unknown as typeof fetch],
    [
      'object instead of array',
      () => respond({ message: 'rate limited' }) as unknown as typeof fetch,
    ],
    ['null payload', () => respond(null) as unknown as typeof fetch],
    ['string payload', () => respond('nope') as unknown as typeof fetch],
    ['only drafts', () => respond([release({ draft: true })]) as unknown as typeof fetch],
    ['only prereleases', () => respond([release({ prerelease: true })]) as unknown as typeof fetch],
    [
      'releases with no tag',
      () => respond([release({ tag_name: undefined })]) as unknown as typeof fetch,
    ],
  ];

  for (const [name, make] of cases) {
    it(`${name}: DOM is unchanged`, async () => {
      const changed = await refreshCard(card, make());
      expect(changed).toBe(false);
      expect(card.innerHTML).toBe(before);
    });
  }

  it('network error rejects, and refreshAll swallows it', async () => {
    const boom = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;

    await expect(refreshCard(card, boom)).rejects.toThrow();

    // The page-level entry point must never surface an unhandled rejection.
    vi.stubGlobal('fetch', boom);
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    refreshAll(document);
    await new Promise((r) => setTimeout(r, 10));
    process.off('unhandledRejection', unhandled);

    expect(unhandled).not.toHaveBeenCalled();
    expect(card.innerHTML).toBe(before);
  });

  it('malformed JSON body leaves the DOM alone via refreshAll', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('bad json');
        },
      })) as unknown as typeof fetch,
    );
    refreshAll(document);
    await new Promise((r) => setTimeout(r, 10));
    expect(card.innerHTML).toBe(before);
  });
});

describe('refreshCard — malformed markup does not throw', () => {
  it('card with no data-project makes no request', async () => {
    document.body.innerHTML = `<article ${SCOPE}></article>`;
    const spy = respond([release()]);
    expect(await refreshCard(document.querySelector('article')!, spy)).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a slug that is not owner/repo, so nothing can be injected into the URL', async () => {
    for (const bad of [
      '../../etc/passwd',
      'owner/repo?x=1',
      'owner repo',
      'owner/repo/extra',
      '',
    ]) {
      const c = buildCard(bad);
      const spy = respond([release()]);
      expect(await refreshCard(c, spy)).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('missing release log still updates the scalar fields', async () => {
    const c = buildCard();
    c.querySelector('[data-release-log]')!.remove();
    expect(await refreshCard(c, respond([release()]))).toBe(true);
    expect(c.querySelector('[data-field="version"]')!.textContent).toBe('v9.9.9');
  });

  it('release log with no template row does not throw', async () => {
    const c = buildCard();
    c.querySelector('[data-release-log]')!.innerHTML = '';
    await expect(refreshCard(c, respond([release()]))).resolves.toBe(true);
  });

  it('missing data-field elements do not throw', async () => {
    const c = buildCard();
    for (const el of c.querySelectorAll('[data-field]')) el.remove();
    await expect(refreshCard(c, respond([release()]))).resolves.toBe(true);
  });

  it('a row missing .tag/.note/time does not throw', async () => {
    const c = buildCard();
    c.querySelector('[data-release-log] li')!.innerHTML = '<span></span>';
    await expect(refreshCard(c, respond([release()]))).resolves.toBe(true);
  });
});

describe('refreshCard — untrusted release content', () => {
  // Release bodies are writable by anyone who can cut a release in a tracked
  // repo, so they are treated as hostile input.
  const payloads = [
    '* <img src=x onerror="alert(1)">',
    '* </script><script>alert(1)</script>',
    '* <svg/onload=alert(1)>',
    '* "><iframe src=javascript:alert(1)>',
  ];

  for (const body of payloads) {
    it(`renders ${body.slice(2, 26)}… as text, not markup`, async () => {
      await refreshCard(card, respond([release({ body })]));
      const note = card.querySelector('.note')!;

      // Nothing was parsed into elements...
      expect(note.querySelector('*')).toBeNull();
      expect(card.querySelectorAll('script, img, svg, iframe')).toHaveLength(0);
      // ...and the payload survives as literal text.
      expect(note.textContent).toContain('<');
    });
  }

  it('a hostile tag name cannot inject an element either', async () => {
    await refreshCard(card, respond([release({ tag_name: '<script>alert(1)</script>' })]));
    expect(card.querySelectorAll('script')).toHaveLength(0);
    expect(card.querySelector('.tag')!.textContent).toContain('<script>');
  });

  it('a hostile date does not become an attribute injection', async () => {
    await refreshCard(card, respond([release({ published_at: '" onload="alert(1)' })]));
    const time = card.querySelector('time')!;
    expect(time.hasAttribute('onload')).toBe(false);
  });
});
