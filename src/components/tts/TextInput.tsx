'use client';

/**
 * TextInput — textarea with 10,000 character counter.
 * Shows warning badge at 9,000 chars, error badge at 10,000+ chars.
 */

import { Box } from '@chakra-ui/react';
import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
}

const MAX_CHARS = 10000;
const WARN_CHARS = 9000;

export const TextInput = memo(function TextInput({
  value,
  onChange,
  placeholder = 'Enter text to synthesize (up to 10,000 characters)...',
  label = 'Text',
  id = 'tts-text',
  disabled = false,
}: TextInputProps) {
  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > WARN_CHARS;

  return (
    <Box display="grid" gap={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Label htmlFor={id}>{label}</Label>
        <Badge
          variant={isOverLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}
          style={{ fontSize: '0.75rem' }}
        >
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </Badge>
      </Box>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minH="8rem"
        maxLength={MAX_CHARS + 1}
        disabled={disabled}
      />
    </Box>
  );
});
