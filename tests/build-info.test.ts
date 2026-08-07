import { describe, expect, it } from 'vitest';
import { buildLabel, commitSha } from '../src/lib/build-info';

/**
 * The footer's job is to say what you are actually looking at. The version
 * alone cannot do that between releases, so the commit is appended — these pin
 * the format and the degradation path.
 */

describe('commitSha', () => {
  it('is a short hex sha, or null when git is unavailable', () => {
    if (commitSha === null) return; // tarball export or no git — allowed
    expect(commitSha).toMatch(/^[0-9a-f]{7}$/);
  });
});

describe('buildLabel', () => {
  it('appends the commit when one is known', () => {
    if (commitSha === null) return;
    expect(buildLabel('1.1.0')).toBe(`v1.1.0 (${commitSha})`);
  });

  it('always starts with a v-prefixed version', () => {
    expect(buildLabel('1.1.0')).toMatch(/^v1\.1\.0\b/);
    expect(buildLabel('2.0.3')).toMatch(/^v2\.0\.3\b/);
  });

  it('never renders an empty or placeholder commit', () => {
    const label = buildLabel('1.0.0');
    expect(label).not.toContain('()');
    expect(label).not.toContain('undefined');
    expect(label).not.toContain('null');
  });
});
