'use client';

/**
 * Voice design workflow page.
 * Enter a prompt and preview text, generate a preview voice, accept or regenerate.
 * Saved voices have a 168-hour TTL.
 */

import Link from 'next/link';
import { Box } from '@chakra-ui/react';
import { VoiceDesigner } from '@/components/voice/VoiceDesigner';

export default function DesignVoicePage() {
  return (
    <Box display="grid" gap={6} maxW="36rem">
      <Box>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Design a Voice</h1>
        <Box color="gray.600" mt={1}>
          Describe the voice you want using natural language. Generate a preview and accept or regenerate.
        </Box>
      </Box>

      {/* Voice Designer — Phase 6 component */}
      <VoiceDesigner />

      {/* Saved Voice — shown via VoiceDesigner internal state */}
      <Box display="grid" gap={4}>
        <Link
          href="/tts"
          style={{ display: 'inline-flex', height: '2rem', width: 'fit-content', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderRadius: '0.5rem', border: '1px solid transparent', backgroundColor: '#111827', padding: '0 0.75rem', fontSize: '0.875rem', fontWeight: 500, color: 'white' }}
        >
          Go to Text to Speech
        </Link>
        <Link
          href="/voices"
          style={{ display: 'inline-flex', height: '2rem', width: 'fit-content', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', backgroundColor: 'white', padding: '0 0.75rem', fontSize: '0.875rem' }}
        >
          View All Voices
        </Link>
      </Box>
    </Box>
  );
}
