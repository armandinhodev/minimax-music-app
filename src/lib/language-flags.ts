/**
 * Language metadata for MiniMax voice prefixes.
 *
 * Each entry maps a MiniMax voice_id prefix (e.g. "English", "Korean", "Robot")
 * to display information used by the System Voices UI.
 *
 * Real languages carry an ISO 3166-1 alpha-2 country code that resolves to a
 * flag image served by the Flagpedia CDN (https://flagcdn.com). PNG is used
 * instead of SVG because the /<size>/<code>.png endpoint always returns a
 * fixed 4:3 aspect ratio, giving layout stability across all 26 flags.
 *
 * Non-language prefixes ("Robot", "Arrogant") have no country code and fall
 * back to an emoji (🤖, ⚠️). Unknown prefixes echo the prefix as the
 * displayName with a 🌐 fallback.
 */

export interface LanguageInfo {
  /** ISO 3166-1 alpha-2 country code (lowercase) when the language has a clear national flag. */
  countryCode?: string;
  /** Human-readable name shown in the UI. */
  displayName: string;
  /** Fallback emoji for non-country cases (Robot, Arrogant, unknown prefix). */
  fallbackEmoji: string;
}

export const LANGUAGE_INFO: Record<string, LanguageInfo> = {
  Portuguese: { countryCode: 'pt', displayName: 'Portuguese', fallbackEmoji: '🌐' },
  Korean: { countryCode: 'kr', displayName: 'Korean', fallbackEmoji: '🌐' },
  Spanish: { countryCode: 'es', displayName: 'Spanish', fallbackEmoji: '🌐' },
  English: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' },
  'Chinese (Mandarin)': { countryCode: 'cn', displayName: 'Chinese (Mandarin)', fallbackEmoji: '🌐' },
  Japanese: { countryCode: 'jp', displayName: 'Japanese', fallbackEmoji: '🌐' },
  Indonesian: { countryCode: 'id', displayName: 'Indonesian', fallbackEmoji: '🌐' },
  Russian: { countryCode: 'ru', displayName: 'Russian', fallbackEmoji: '🌐' },
  French: { countryCode: 'fr', displayName: 'French', fallbackEmoji: '🌐' },
  Cantonese: { countryCode: 'hk', displayName: 'Cantonese', fallbackEmoji: '🌐' },
  Italian: { countryCode: 'it', displayName: 'Italian', fallbackEmoji: '🌐' },
  Romanian: { countryCode: 'ro', displayName: 'Romanian', fallbackEmoji: '🌐' },
  Polish: { countryCode: 'pl', displayName: 'Polish', fallbackEmoji: '🌐' },
  Thai: { countryCode: 'th', displayName: 'Thai', fallbackEmoji: '🌐' },
  greek: { countryCode: 'gr', displayName: 'Greek', fallbackEmoji: '🌐' },
  finnish: { countryCode: 'fi', displayName: 'Finnish', fallbackEmoji: '🌐' },
  czech: { countryCode: 'cz', displayName: 'Czech', fallbackEmoji: '🌐' },
  hindi: { countryCode: 'in', displayName: 'Hindi', fallbackEmoji: '🌐' },
  German: { countryCode: 'de', displayName: 'German', fallbackEmoji: '🌐' },
  Dutch: { countryCode: 'nl', displayName: 'Dutch', fallbackEmoji: '🌐' },
  Arabic: { countryCode: 'sa', displayName: 'Arabic', fallbackEmoji: '🌐' },
  Turkish: { countryCode: 'tr', displayName: 'Turkish', fallbackEmoji: '🌐' },
  Ukrainian: { countryCode: 'ua', displayName: 'Ukrainian', fallbackEmoji: '🌐' },
  Vietnamese: { countryCode: 'vn', displayName: 'Vietnamese', fallbackEmoji: '🌐' },
  Robot: { displayName: 'Robot / Synthetic', fallbackEmoji: '🤖' },
  Arrogant: { displayName: 'Other', fallbackEmoji: '⚠️' },
};

export const FLAG_SIZE_CARD = '20x15';
export const FLAG_SIZE_HEADER = '40x30';

/** Build a flagcdn.com URL for the given ISO 3166-1 alpha-2 country code and size. */
export function getFlagUrl(countryCode: string, size: string): string {
  return `https://flagcdn.com/${size}/${countryCode.toLowerCase()}.png`;
}

/** Look up language info for a MiniMax voice_id prefix. Returns the matching entry or an Unknown fallback. */
export function getLanguageInfo(prefix: string | undefined): LanguageInfo {
  if (!prefix) return { displayName: 'Unknown', fallbackEmoji: '🌐' };
  return LANGUAGE_INFO[prefix] ?? { displayName: prefix, fallbackEmoji: '🌐' };
}
