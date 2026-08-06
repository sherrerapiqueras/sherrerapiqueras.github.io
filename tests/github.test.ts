import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchReleases, firstLine, toReleaseData } from '../src/lib/github';

/**
 * The registry's whole promise is "nothing here is typed by hand", which means
 * the GitHub API is a hard dependency of every build. These tests pin down what
 * happens when it misbehaves: the answer must always be "return null and let
 * the caller fall back", never "throw" and never "render something wrong".
 */

const release = (over: Record<string, unknown> = {}) => ({
  tag_name: 'v1.2.3',
  published_at: '2026-08-04T10:11:12Z',
  body: '* #1: did a thing',
  draft: false,
  prerelease: false,
  ...over,
});

/** A Response-shaped stub; `fetch` is injected so no network is touched. */
const ok = (payload: unknown) =>
  ({ ok: true, status: 200, json: async () => payload }) as unknown as Response;

/*
 * Error responses carry a *valid-looking* body on purpose. With an empty body
 * these tests passed even with the `res.ok` check deleted, because the payload
 * was rejected further down — they were green for the wrong reason. A caching
 * proxy returning stale JSON with a 5xx is exactly the case the status check
 * exists for, so the body must be something that would otherwise be accepted.
 */
const notOk = (status: number) =>
  ({ ok: false, status, json: async () => [release()] }) as unknown as Response;

afterEach(() => vi.unstubAllGlobals());

describe('firstLine', () => {
  it('returns an em dash for empty bodies', () => {
    expect(firstLine(null)).toBe('—');
    expect(firstLine(undefined)).toBe('—');
    expect(firstLine('')).toBe('—');
    expect(firstLine('   \n  \n')).toBe('—');
  });

  it('prefers the first bulleted line over preamble prose', () => {
    const body = ['## What changed', 'some preamble', '* the real note', '* second note'].join(
      '\n',
    );
    expect(firstLine(body)).toBe('the real note');
  });

  it('accepts both bullet markers', () => {
    expect(firstLine('- dash bullet')).toBe('dash bullet');
    expect(firstLine('* star bullet')).toBe('star bullet');
  });

  it('falls back to the first line when there are no bullets', () => {
    expect(firstLine('just a sentence\nand another')).toBe('just a sentence');
  });

  it('strips bold markers, trailing commit links and stray brackets', () => {
    expect(firstLine('* **bold** note ([#123](https://example.com/pr/123))')).toBe('bold note');
    expect(firstLine('* note with [brackets] inside')).toBe('note with brackets inside');
  });

  it('truncates to 62 characters with an ellipsis', () => {
    const long = `* ${'x'.repeat(200)}`;
    const out = firstLine(long);
    expect(out).toHaveLength(63); // 62 chars + the ellipsis
    expect(out.endsWith('…')).toBe(true);
  });

  it('leaves a 62-character note untruncated', () => {
    const out = firstLine(`* ${'x'.repeat(62)}`);
    expect(out).toBe('x'.repeat(62));
    expect(out).not.toContain('…');
  });

  it('does not throw on unusual input', () => {
    expect(() => firstLine('*')).not.toThrow();
    expect(() => firstLine('-')).not.toThrow();
    expect(() => firstLine('* ([only a link](x))')).not.toThrow();
    expect(firstLine('* 🎉 emoji note')).toBe('🎉 emoji note');
  });

  it('returns hostile markup verbatim rather than interpreting it', () => {
    // Escaping is the renderer's job (textContent / Astro). What matters here
    // is that parsing neither executes nor silently drops the content.
    const out = firstLine('* <img src=x onerror=alert(1)>');
    expect(out).toContain('<img');
    expect(out).toContain('onerror');
  });
});

describe('toReleaseData', () => {
  it('returns null for an empty list', () => {
    expect(toReleaseData([])).toBeNull();
  });

  it('returns null when every release is a draft or prerelease', () => {
    expect(toReleaseData([release({ draft: true }), release({ prerelease: true })])).toBeNull();
  });

  it('returns null when releases have no tag', () => {
    expect(toReleaseData([release({ tag_name: undefined })])).toBeNull();
  });

  it('strips a leading v from the version but not from the tag', () => {
    const data = toReleaseData([release({ tag_name: 'v2.0.0' })])!;
    expect(data.version).toBe('2.0.0');
    expect(data.releases[0].tag).toBe('v2.0.0');
  });

  it('handles a tag with no leading v', () => {
    expect(toReleaseData([release({ tag_name: '3.1.0' })])!.version).toBe('3.1.0');
  });

  it('counts only published releases, not the page size', () => {
    const list = [
      ...Array.from({ length: 5 }, () => release()),
      release({ draft: true }),
      release({ prerelease: true }),
    ];
    expect(toReleaseData(list)!.releaseCount).toBe(5);
  });

  it('shows at most four rows in the log', () => {
    const data = toReleaseData(Array.from({ length: 40 }, () => release()))!;
    expect(data.releases).toHaveLength(4);
    expect(data.releaseCount).toBe(40);
  });

  it('slices the date to YYYY-MM-DD', () => {
    expect(toReleaseData([release()])!.lastShip).toBe('2026-08-04');
  });

  it('survives a null published_at', () => {
    const data = toReleaseData([release({ published_at: null })])!;
    expect(data.lastShip).toBe('');
    expect(data.releases[0].date).toBe('');
  });

  it('marks the result live', () => {
    expect(toReleaseData([release()])!.live).toBe(true);
  });
});

describe('fetchReleases — failure modes', () => {
  // Each test uses a distinct slug: results are memoised per slug by design.
  it('returns null on 403 (rate limited)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => notOk(403)),
    );
    expect(await fetchReleases('owner/rate-limited')).toBeNull();
  });

  it('returns null on 404 (repo renamed or made private)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => notOk(404)),
    );
    expect(await fetchReleases('owner/missing')).toBeNull();
  });

  it('returns null on 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => notOk(500)),
    );
    expect(await fetchReleases('owner/server-error')).toBeNull();
  });

  it('returns null when the network is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    expect(await fetchReleases('owner/offline')).toBeNull();
  });

  it('returns null when the request is aborted (timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      }),
    );
    expect(await fetchReleases('owner/timeout')).toBeNull();
  });

  it('returns null when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => {
              throw new SyntaxError('Unexpected token < in JSON');
            },
          }) as unknown as Response,
      ),
    );
    expect(await fetchReleases('owner/html-error-page')).toBeNull();
  });

  it('returns null when the payload is an object, not an array', async () => {
    // What the API actually returns for rate limits with a 200 in some proxies.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ok({ message: 'API rate limit exceeded' })),
    );
    expect(await fetchReleases('owner/object-payload')).toBeNull();
  });

  it('returns null for an empty release list (repo with no releases yet)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ok([])),
    );
    expect(await fetchReleases('owner/no-releases')).toBeNull();
  });

  it('never rejects — callers rely on that to fall back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('catastrophic');
      }),
    );
    await expect(fetchReleases('owner/throws')).resolves.toBeNull();
  });

  it('parses a healthy response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ok([release()])),
    );
    const data = await fetchReleases('owner/healthy');
    expect(data).toMatchObject({ version: '1.2.3', lastShip: '2026-08-04', live: true });
  });

  it('sends no Authorization header when no token is present', async () => {
    const spy = vi.fn(async () => ok([release()]));
    vi.stubGlobal('fetch', spy);
    const previous = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      await fetchReleases('owner/no-token');
      const headers = spy.mock.calls[0][1].headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    } finally {
      if (previous !== undefined) process.env.GITHUB_TOKEN = previous;
    }
  });

  it('makes one request per slug even when asked twice', async () => {
    const spy = vi.fn(async () => ok([release()]));
    vi.stubGlobal('fetch', spy);
    const [a, b] = await Promise.all([
      fetchReleases('owner/memoised'),
      fetchReleases('owner/memoised'),
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });
});
