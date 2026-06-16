import { describe, it, expect } from 'vitest';
import { parseGfa, parseTags, tagListToObject } from './parseGfa';
import tinyGfa from '../test/fixtures/tiny.gfa?raw';
import lengthContrastGfa from '../test/fixtures/length_contrast.gfa?raw';
import missingLnGfa from '../test/fixtures/missing_ln.gfa?raw';
import malformedRecordsGfa from '../test/fixtures/malformed_records.gfa?raw';
import unsupportedRecordsGfa from '../test/fixtures/unsupported_records.gfa?raw';
import pathsGfa from '../test/fixtures/paths.gfa?raw';
import duplicateSegmentsGfa from '../test/fixtures/duplicate_segments.gfa?raw';
import selfLoopGfa from '../test/fixtures/self_loop.gfa?raw';
import disconnectedGfa from '../test/fixtures/disconnected_components.gfa?raw';

const TINY_GFA = `H\tVN:Z:1.0
S\tcontig1\tACGTACGT\tLN:i:8\tDP:f:12.4
S\tcontig2\tGGTTGGTT\tLN:i:8\tDP:f:8.1
L\tcontig1\t+\tcontig2\t-\t4M
`;

describe('parseTags', () => {
  it('parses integer tag', () => {
    const tags = parseTags(['LN:i:12345']);
    expect(tags).toEqual([{ name: 'LN', type: 'i', value: '12345' }]);
  });

  it('parses float tag', () => {
    const tags = parseTags(['DP:f:12.4']);
    expect(tags).toEqual([{ name: 'DP', type: 'f', value: '12.4' }]);
  });

  it('parses string tag', () => {
    const tags = parseTags(['VN:Z:1.0']);
    expect(tags).toEqual([{ name: 'VN', type: 'Z', value: '1.0' }]);
  });

  it('ignores non-tag fields', () => {
    const tags = parseTags(['notAtag', 'also:bad']);
    expect(tags).toHaveLength(0);
  });

  it('parses multiple tags', () => {
    const tags = parseTags(['LN:i:100', 'DP:f:5.0', 'RC:i:42']);
    expect(tags).toHaveLength(3);
  });
});

describe('tagListToObject', () => {
  it('converts tag array to object', () => {
    const tags = parseTags(['LN:i:100', 'DP:f:5.0']);
    const obj = tagListToObject(tags);
    expect(obj).toEqual({ LN: '100', DP: '5.0' });
  });
});

describe('parseGfa – minimal GFA', () => {
  it('parses header', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.header).toBeDefined();
    expect(result.header?.tags[0]).toEqual({ name: 'VN', type: 'Z', value: '1.0' });
  });

  it('parses two segments', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.segments).toHaveLength(2);
  });

  it('parses segment names', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.segments[0].name).toBe('contig1');
    expect(result.segments[1].name).toBe('contig2');
  });

  it('parses segment sequences', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.segments[0].sequence).toBe('ACGTACGT');
  });

  it('preserves raw lines on segments', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.segments[0].rawLine).toContain('contig1');
  });

  it('parses segment tags', () => {
    const result = parseGfa(TINY_GFA);
    const tags = tagListToObject(result.segments[0].tags);
    expect(tags['LN']).toBe('8');
    expect(tags['DP']).toBe('12.4');
  });

  it('parses one link', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.links).toHaveLength(1);
  });

  it('parses link fields', () => {
    const result = parseGfa(TINY_GFA);
    const link = result.links[0];
    expect(link.from).toBe('contig1');
    expect(link.fromOrient).toBe('+');
    expect(link.to).toBe('contig2');
    expect(link.toOrient).toBe('-');
    expect(link.overlap).toBe('4M');
  });

  it('preserves raw line on link', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.links[0].rawLine).toContain('contig1');
  });

  it('produces no warnings for valid GFA', () => {
    const result = parseGfa(TINY_GFA);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('parseGfa – S record with * sequence and LN tag', () => {
  it('parses * sequence correctly', () => {
    const gfa = 'S\tnode1\t*\tLN:i:1000\n';
    const result = parseGfa(gfa);
    expect(result.segments[0].sequence).toBe('*');
    expect(tagListToObject(result.segments[0].tags)['LN']).toBe('1000');
  });
});

describe('parseGfa – P records', () => {
  it('parses path records', () => {
    const gfa = 'P\tpath1\tcontig1+,contig2-\t4M\n';
    const result = parseGfa(gfa);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].name).toBe('path1');
    expect(result.paths[0].segmentNames).toEqual(['contig1+', 'contig2-']);
  });
});

describe('parseGfa – CRLF line endings', () => {
  it('handles Windows line endings', () => {
    const gfa = 'H\tVN:Z:1.0\r\nS\ta\t*\tLN:i:100\r\n';
    const result = parseGfa(gfa);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].name).toBe('a');
  });
});

describe('parseGfa – unsupported records', () => {
  it('stores unsupported records with warnings', () => {
    const gfa = 'X\tsomething\n';
    const result = parseGfa(gfa);
    expect(result.unsupported).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('X');
  });
});

describe('parseGfa – empty lines', () => {
  it('skips empty lines without warnings', () => {
    const gfa = '\nS\ta\tACGT\n\n';
    const result = parseGfa(gfa);
    expect(result.segments).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('parseGfa – malformed S record', () => {
  it('warns on S record with too few fields', () => {
    const gfa = 'S\tonlyone\n';
    const result = parseGfa(gfa);
    expect(result.segments).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });
});

describe('parseGfa – malformed L record', () => {
  it('warns on L record with too few fields', () => {
    const gfa = 'L\ta\t+\tb\n';
    const result = parseGfa(gfa);
    expect(result.links).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });
});

// ── fixture-based tests ──────────────────────────────────────────────────────

describe('parseGfa – fixture: tiny.gfa', () => {
  it('matches inline TINY_GFA constant', () => {
    const fromFixture = parseGfa(tinyGfa);
    const fromInline = parseGfa(TINY_GFA);
    expect(fromFixture.segments).toHaveLength(fromInline.segments.length);
    expect(fromFixture.links).toHaveLength(fromInline.links.length);
  });
});

describe('parseGfa – fixture: length_contrast.gfa', () => {
  it('parses 3 segments', () => {
    const result = parseGfa(lengthContrastGfa);
    expect(result.segments).toHaveLength(3);
  });

  it('parses 2 links', () => {
    const result = parseGfa(lengthContrastGfa);
    expect(result.links).toHaveLength(2);
  });

  it('segment names are short, medium, long', () => {
    const result = parseGfa(lengthContrastGfa);
    expect(result.segments.map((s) => s.name)).toEqual(['short', 'medium', 'long']);
  });
});

describe('parseGfa – fixture: missing_ln.gfa', () => {
  it('parses segment with * sequence and no LN tag', () => {
    const result = parseGfa(missingLnGfa);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].name).toBe('unknown');
    expect(result.segments[0].sequence).toBe('*');
  });

  it('produces no warnings for missing LN (parser stores the segment)', () => {
    const result = parseGfa(missingLnGfa);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('parseGfa – fixture: malformed_records.gfa', () => {
  it('produces warnings for malformed S and L records', () => {
    const result = parseGfa(malformedRecordsGfa);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('does not silently produce nodes from malformed S record', () => {
    const result = parseGfa(malformedRecordsGfa);
    expect(result.segments).toHaveLength(0);
  });

  it('does not silently produce edges from malformed L record', () => {
    const result = parseGfa(malformedRecordsGfa);
    expect(result.links).toHaveLength(0);
  });

  it('stores unsupported X record', () => {
    const result = parseGfa(malformedRecordsGfa);
    expect(result.unsupported.some((u) => u.type === 'X')).toBe(true);
  });

  it('includes line numbers in warnings', () => {
    const result = parseGfa(malformedRecordsGfa);
    expect(result.warnings.some((w) => /Line \d+/.test(w))).toBe(true);
  });
});

describe('parseGfa – fixture: unsupported_records.gfa', () => {
  it('parses the known segment A', () => {
    const result = parseGfa(unsupportedRecordsGfa);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].name).toBe('A');
  });

  it('stores W and J records as unsupported', () => {
    const result = parseGfa(unsupportedRecordsGfa);
    const types = result.unsupported.map((u) => u.type);
    expect(types).toContain('W');
    expect(types).toContain('J');
  });

  it('emits warnings for unsupported records', () => {
    const result = parseGfa(unsupportedRecordsGfa);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('parseGfa – fixture: paths.gfa', () => {
  it('parses segments and link', () => {
    const result = parseGfa(pathsGfa);
    expect(result.segments).toHaveLength(2);
    expect(result.links).toHaveLength(1);
  });

  it('parses the P record', () => {
    const result = parseGfa(pathsGfa);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].name).toBe('path1');
  });
});

describe('parseGfa – fixture: duplicate_segments.gfa', () => {
  it('parses both segment records (parser does not deduplicate)', () => {
    const result = parseGfa(duplicateSegmentsGfa);
    expect(result.segments).toHaveLength(2);
  });

  it('both segments have id A', () => {
    const result = parseGfa(duplicateSegmentsGfa);
    expect(result.segments[0].name).toBe('A');
    expect(result.segments[1].name).toBe('A');
  });
});

describe('parseGfa – fixture: self_loop.gfa', () => {
  it('parses one segment and one self-loop link', () => {
    const result = parseGfa(selfLoopGfa);
    expect(result.segments).toHaveLength(1);
    expect(result.links).toHaveLength(1);
  });

  it('self-loop link has same from and to', () => {
    const result = parseGfa(selfLoopGfa);
    const link = result.links[0];
    expect(link.from).toBe('A');
    expect(link.to).toBe('A');
  });
});

describe('parseGfa – fixture: disconnected_components.gfa', () => {
  it('parses 3 segments', () => {
    const result = parseGfa(disconnectedGfa);
    expect(result.segments).toHaveLength(3);
  });

  it('parses 1 link', () => {
    const result = parseGfa(disconnectedGfa);
    expect(result.links).toHaveLength(1);
  });
});

// ── tag edge cases ────────────────────────────────────────────────────────────

describe('parseTags – values with colons', () => {
  it('preserves value with extra colons intact', () => {
    // XX:B:i,1,2,3 – the value after TYPE: may contain colons
    const tags = parseTags(['CL:Z:rgb(0:0:255)']);
    expect(tags).toHaveLength(1);
    expect(tags[0].value).toBe('rgb(0:0:255)');
  });

  it('parses B-type array tag without truncating value', () => {
    const tags = parseTags(['XX:B:i,1,2,3']);
    expect(tags).toHaveLength(1);
    expect(tags[0].value).toBe('i,1,2,3');
  });
});

// ── trailing newlines / whitespace ───────────────────────────────────────────

describe('parseGfa – trailing newline', () => {
  it('handles trailing newline without producing extra warnings', () => {
    const result = parseGfa('S\ta\tACGT\n');
    expect(result.segments).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });
});

// ── regression tests ─────────────────────────────────────────────────────────

describe('parseGfa – regression: segment sequence length used correctly', () => {
  it('sequence ACGTACGT gives 8-character sequence', () => {
    const result = parseGfa('S\tA\tACGTACGT\n');
    expect(result.segments[0].sequence).toBe('ACGTACGT');
    expect(result.segments[0].sequence.length).toBe(8);
  });

  it('sequence * is not a real sequence', () => {
    const result = parseGfa('S\tA\t*\tLN:i:12345\n');
    expect(result.segments[0].sequence).toBe('*');
    expect(tagListToObject(result.segments[0].tags)['LN']).toBe('12345');
  });
});
