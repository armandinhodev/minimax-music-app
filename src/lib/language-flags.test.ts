import { describe, expect, it } from 'vitest';
import { getLanguageInfo, LANGUAGE_FLAGS } from './language-flags';

const expectedFlags: Record<string, string> = {
  Portuguese: '🇵🇹', Korean: '🇰🇷', Spanish: '🇪🇸', English: '🇬🇧',
  'Chinese (Mandarin)': '🇨🇳', Japanese: '🇯🇵', Indonesian: '🇮🇩', Russian: '🇷🇺',
  French: '🇫🇷', Cantonese: '🇭🇰', Italian: '🇮🇹', Romanian: '🇷🇴', Polish: '🇵🇱',
  Thai: '🇹🇭', greek: '🇬🇷', finnish: '🇫🇮', czech: '🇨🇿', hindi: '🇮🇳', German: '🇩🇪',
  Dutch: '🇳🇱', Arabic: '🇸🇦', Turkish: '🇹🇷', Ukrainian: '🇺🇦', Vietnamese: '🇻🇳',
  Robot: '🤖', Arrogant: '⚠️',
};

describe('language flags', () => {
  it('maps all known MiniMax language prefixes to the expected flags', () => {
    expect(Object.keys(LANGUAGE_FLAGS)).toHaveLength(26);
    for (const [prefix, flag] of Object.entries(expectedFlags)) {
      expect(getLanguageInfo(prefix).flag).toBe(flag);
    }
  });

  it('returns normalized information for a known prefix', () => {
    expect(getLanguageInfo('czech')).toEqual({ flag: '🇨🇿', displayName: 'Czech' });
  });

  it('returns Unknown for undefined and empty prefixes', () => {
    expect(getLanguageInfo(undefined)).toEqual({ flag: '🌐', displayName: 'Unknown' });
    expect(getLanguageInfo('')).toEqual({ flag: '🌐', displayName: 'Unknown' });
  });

  it('echoes an unknown prefix with a globe flag', () => {
    expect(getLanguageInfo('Klingon')).toEqual({ flag: '🌐', displayName: 'Klingon' });
  });
});
