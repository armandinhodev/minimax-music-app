import { describe, expect, it } from 'vitest';
import { getFlagUrl, getLanguageInfo, LANGUAGE_INFO } from './language-flags';

const expectedCountryCodes: Record<string, string> = {
  Portuguese: 'pt', Korean: 'kr', Spanish: 'es', English: 'gb',
  'Chinese (Mandarin)': 'cn', Japanese: 'jp', Indonesian: 'id', Russian: 'ru',
  French: 'fr', Cantonese: 'hk', Italian: 'it', Romanian: 'ro', Polish: 'pl',
  Thai: 'th', greek: 'gr', finnish: 'fi', czech: 'cz', hindi: 'in', German: 'de',
  Dutch: 'nl', Arabic: 'sa', Turkish: 'tr', Ukrainian: 'ua', Vietnamese: 'vn',
};

describe('language flags', () => {
  it('maps all known MiniMax language prefixes to the expected country codes and names', () => {
    expect(Object.keys(LANGUAGE_INFO)).toHaveLength(26);
    for (const [prefix, countryCode] of Object.entries(expectedCountryCodes)) {
      const info = getLanguageInfo(prefix);
      expect(info.countryCode).toBe(countryCode);
      expect(info.displayName).toBeTruthy();
      expect(info.fallbackEmoji).toBe('🌐');
    }
  });

  it('returns normalized information for a known prefix', () => {
    expect(getLanguageInfo('czech')).toEqual({ countryCode: 'cz', displayName: 'Czech', fallbackEmoji: '🌐' });
  });

  it('returns Unknown for undefined and empty prefixes', () => {
    expect(getLanguageInfo(undefined)).toEqual({ displayName: 'Unknown', fallbackEmoji: '🌐' });
    expect(getLanguageInfo('')).toEqual({ displayName: 'Unknown', fallbackEmoji: '🌐' });
  });

  it('echoes an unknown prefix with a globe emoji', () => {
    expect(getLanguageInfo('Klingon')).toEqual({ displayName: 'Klingon', fallbackEmoji: '🌐' });
  });

  it('uses fallback emojis for non-language prefixes and has no country code', () => {
    const robot = getLanguageInfo('Robot');
    expect(robot.countryCode).toBeUndefined();
    expect(robot.fallbackEmoji).toBe('🤖');
    expect(robot.displayName).toBe('Robot / Synthetic');

    const arrogant = getLanguageInfo('Arrogant');
    expect(arrogant.countryCode).toBeUndefined();
    expect(arrogant.fallbackEmoji).toBe('⚠️');
    expect(arrogant.displayName).toBe('Other');
  });

  it('builds flagcdn.com URLs with the requested size and lowercased country code', () => {
    expect(getFlagUrl('gb', '24x18')).toBe('https://flagcdn.com/24x18/gb.png');
    expect(getFlagUrl('GB', '24x18')).toBe('https://flagcdn.com/24x18/gb.png');
  });
});
