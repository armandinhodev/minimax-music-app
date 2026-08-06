'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import type { LibraryGenerationDTO, LibrarySummaryDTO } from '@/application/dto/LibraryDTO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth-client';

const EMPTY_SUMMARY: LibrarySummaryDTO = {
  totalGenerations: 0,
  totalAssets: 0,
  completedGenerations: 0,
  byKind: { tts: 0, music: 0, image: 0, clone: 0, design: 0 },
  recentGenerations: [],
};

const PRODUCT_CARDS = [
  {
    title: 'Speech',
    href: '/tts',
    accent: 'green' as const,
    description: 'Generate natural voice clips and stream fast previews.',
    metric: 'tts' as const,
  },
  {
    title: 'Image',
    href: '/image',
    accent: 'blue' as const,
    description: 'Create visual assets from prompts or image references.',
    metric: 'image' as const,
  },
  {
    title: 'Music',
    href: '/music',
    accent: 'purple' as const,
    description: 'Compose vocal or instrumental tracks with MiniMax Music.',
    metric: 'music' as const,
  },
  {
    title: 'Library',
    href: '/library',
    accent: 'teal' as const,
    description: 'Review saved metadata and browser-stored assets.',
    metric: null,
  },
];

const QUICK_ACTIONS = [
  { href: '/tts', label: 'Generate speech' },
  { href: '/image', label: 'Create image' },
  { href: '/music', label: 'Compose music' },
  { href: '/library', label: 'Open Library' },
];

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getGenerationLabel(generation: LibraryGenerationDTO): string {
  if (generation.kind === 'tts') return 'Speech';
  if (generation.kind === 'music') return 'Music';
  if (generation.kind === 'image') return 'Image';
  if (generation.kind === 'clone') return 'Voice clone';
  return 'Designed voice';
}

function getGenerationHref(generation: LibraryGenerationDTO): string {
  if (generation.kind === 'music') return '/music';
  if (generation.kind === 'image') return '/image';
  if (generation.kind === 'clone' || generation.kind === 'design') return '/voices';
  return '/tts';
}

function getGenerationTitle(generation: LibraryGenerationDTO): string {
  return generation.title ?? generation.prompt ?? getGenerationLabel(generation);
}

function buildSummary(generations: LibraryGenerationDTO[]): LibrarySummaryDTO {
  return generations.reduce<LibrarySummaryDTO>((summary, generation) => {
    summary.totalGenerations += 1;
    summary.totalAssets += generation.assets.length;
    summary.byKind[generation.kind] += 1;
    if (generation.status === 'completed') summary.completedGenerations += 1;
    return summary;
  }, {
    ...EMPTY_SUMMARY,
    byKind: { ...EMPTY_SUMMARY.byKind },
    recentGenerations: generations.slice(0, 5),
  });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<LibrarySummaryDTO>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await authFetch('/api/library/generations?limit=5');
        if (!response.ok) return;
        const data = await response.json() as { generations?: LibraryGenerationDTO[] };
        if (isMounted) setSummary(buildSummary(data.generations ?? []));
      } catch (error) {
        console.error('Failed to load dashboard summary.', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box display="grid" gap={6}>
      <Box
        border="1px solid"
        borderColor="gray.200"
        borderRadius="2xl"
        bg="linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #312e81 100%)"
        color="white"
        p={{ base: '1.25rem', md: '2rem' }}
        overflow="hidden"
      >
        <Box maxW="56rem">
          <Box as="p" color="cyan.100" fontSize="sm" fontWeight={700} letterSpacing="0.08em" textTransform="uppercase">
            Operational dashboard
          </Box>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4.25rem)', lineHeight: 0.95, fontWeight: 900, letterSpacing: '-0.06em', marginTop: '0.75rem' }}>
            Create, track, and recover MiniMax outputs from one place.
          </h1>
          <Box color="slate.200" fontSize={{ base: 'md', md: 'lg' }} mt={4} maxW="42rem">
            Metadata is stored in local SQLite. Large audio and image files stay outside the database as browser blobs or provider URLs.
          </Box>
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
        <Card accent="gray">
          <CardHeader>
            <CardTitle>Total generations</CardTitle>
            <CardDescription>SQLite metadata records</CardDescription>
          </CardHeader>
          <CardContent>
            <Box fontSize="2rem" fontWeight={900}>{summary.totalGenerations}</Box>
          </CardContent>
        </Card>
        <Card accent="green">
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Successful generation records</CardDescription>
          </CardHeader>
          <CardContent>
            <Box fontSize="2rem" fontWeight={900}>{summary.completedGenerations}</Box>
          </CardContent>
        </Card>
        <Card accent="blue">
          <CardHeader>
            <CardTitle>Assets tracked</CardTitle>
            <CardDescription>Metadata references, not binary blobs</CardDescription>
          </CardHeader>
          <CardContent>
            <Box fontSize="2rem" fontWeight={900}>{summary.totalAssets}</Box>
          </CardContent>
        </Card>
      </Box>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: '1fr 0.8fr' }} gap={6} alignItems="start">
        <Box display="grid" gap={4}>
          <Box>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Product areas</h2>
            <Box color="gray.600" mt={1}>Jump directly into the generation workflow you need.</Box>
          </Box>
          <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            {PRODUCT_CARDS.map((product) => (
              <Card key={product.href} accent={product.accent} minH="12rem">
                <CardHeader>
                  <CardTitle>{product.title}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent display="grid" gap={4}>
                  <Box color="gray.700" fontSize="sm">
                    {product.metric ? `${summary.byKind[product.metric]} records tracked` : `${summary.totalAssets} assets tracked`}
                  </Box>
                  <Link href={product.href} style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none' }}>
                    Open {product.title}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        <Box display="grid" gap={4}>
          <Card accent="purple">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Start the common flows without hunting through navigation.</CardDescription>
            </CardHeader>
            <CardContent display="grid" gap={2}>
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', color: '#111827', fontWeight: 750, padding: '0.75rem', textDecoration: 'none' }}
                >
                  {action.label}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card accent="teal">
            <CardHeader>
              <CardTitle>Recent creations</CardTitle>
              <CardDescription>Latest records from SQLite.</CardDescription>
            </CardHeader>
            <CardContent display="grid" gap={3}>
              {isLoading ? (
                <Box border="1px dashed" borderColor="gray.300" borderRadius="xl" p="1rem" color="gray.600" bg="gray.50">
                  Loading recent creations...
                </Box>
              ) : summary.recentGenerations.length > 0 ? (
                summary.recentGenerations.map((generation) => (
                  <Link
                    key={generation.id}
                    href={getGenerationHref(generation)}
                    style={{ border: '1px solid #e5e7eb', borderRadius: '0.85rem', color: '#111827', display: 'grid', gap: '0.25rem', padding: '0.75rem', textDecoration: 'none' }}
                  >
                    <span style={{ color: '#0f766e', fontSize: '0.75rem', fontWeight: 850, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {getGenerationLabel(generation)} · {formatDate(generation.createdAt)}
                    </span>
                    <span style={{ fontWeight: 800 }}>{getGenerationTitle(generation)}</span>
                    <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                      {generation.assets.length} asset reference{generation.assets.length === 1 ? '' : 's'} tracked
                    </span>
                  </Link>
                ))
              ) : (
                <Box border="1px dashed" borderColor="gray.300" borderRadius="xl" p="1rem" color="gray.600" bg="gray.50">
                  No SQLite records yet. Generate speech, images, or music to populate this dashboard.
                  <Box mt={3}>
                    <Link href="/tts" style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none' }}>
                      Generate speech
                    </Link>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
