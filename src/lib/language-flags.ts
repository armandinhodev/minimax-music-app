export const LANGUAGE_FLAGS: Record<string, { flag: string; displayName: string }> = {
  Portuguese: { flag: '🇵🇹', displayName: 'Portuguese' },
  Korean: { flag: '🇰🇷', displayName: 'Korean' },
  Spanish: { flag: '🇪🇸', displayName: 'Spanish' },
  English: { flag: '🇬🇧', displayName: 'English' },
  'Chinese (Mandarin)': { flag: '🇨🇳', displayName: 'Chinese (Mandarin)' },
  Japanese: { flag: '🇯🇵', displayName: 'Japanese' },
  Indonesian: { flag: '🇮🇩', displayName: 'Indonesian' },
  Russian: { flag: '🇷🇺', displayName: 'Russian' },
  French: { flag: '🇫🇷', displayName: 'French' },
  Cantonese: { flag: '🇭🇰', displayName: 'Cantonese' },
  Italian: { flag: '🇮🇹', displayName: 'Italian' },
  Romanian: { flag: '🇷🇴', displayName: 'Romanian' },
  Polish: { flag: '🇵🇱', displayName: 'Polish' },
  Thai: { flag: '🇹🇭', displayName: 'Thai' },
  greek: { flag: '🇬🇷', displayName: 'Greek' },
  finnish: { flag: '🇫🇮', displayName: 'Finnish' },
  czech: { flag: '🇨🇿', displayName: 'Czech' },
  hindi: { flag: '🇮🇳', displayName: 'Hindi' },
  German: { flag: '🇩🇪', displayName: 'German' },
  Dutch: { flag: '🇳🇱', displayName: 'Dutch' },
  Arabic: { flag: '🇸🇦', displayName: 'Arabic' },
  Turkish: { flag: '🇹🇷', displayName: 'Turkish' },
  Ukrainian: { flag: '🇺🇦', displayName: 'Ukrainian' },
  Vietnamese: { flag: '🇻🇳', displayName: 'Vietnamese' },
  Robot: { flag: '🤖', displayName: 'Robot' },
  Arrogant: { flag: '⚠️', displayName: 'Arrogant' },
};

export function getLanguageInfo(prefix: string | undefined): { flag: string; displayName: string } {
  if (!prefix) return { flag: '🌐', displayName: 'Unknown' };
  return LANGUAGE_FLAGS[prefix] ?? { flag: '🌐', displayName: prefix };
}
