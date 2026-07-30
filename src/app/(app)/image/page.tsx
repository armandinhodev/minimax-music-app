'use client';

import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { saveHistoryItem } from '@/lib/history';

const PROMPT_MAX_LENGTH = 1500;

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: 'Square', size: '1024 x 1024', hint: 'Covers and avatars' },
  { value: '16:9', label: 'Widescreen', size: '1280 x 720', hint: 'Hero images' },
  { value: '4:3', label: 'Classic', size: '1152 x 864', hint: 'Editorial frames' },
  { value: '3:2', label: 'Photo', size: '1248 x 832', hint: 'Product shots' },
  { value: '2:3', label: 'Portrait', size: '832 x 1248', hint: 'Posters' },
  { value: '3:4', label: 'Tall card', size: '864 x 1152', hint: 'Social assets' },
  { value: '9:16', label: 'Story', size: '720 x 1280', hint: 'Mobile stories' },
  { value: '21:9', label: 'Cinematic', size: '1344 x 576', hint: 'Banners' },
] as const;

type AspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number]['value'];

interface ImageGenerationResult {
  id: string;
  imageUrls: string[];
  aspectRatio: AspectRatio;
  metadata: {
    successCount: number;
    failedCount: number;
  };
  expiresAt: number;
}

function downloadImageUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ImagePage() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageCount, setImageCount] = useState(1);
  const [seed, setSeed] = useState('');
  const [promptOptimizer, setPromptOptimizer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const remainingCharacters = PROMPT_MAX_LENGTH - prompt.length;
  const selectedRatio = ASPECT_RATIO_OPTIONS.find((option) => option.value === aspectRatio) ?? ASPECT_RATIO_OPTIONS[0];
  const resultRatio = result
    ? ASPECT_RATIO_OPTIONS.find((option) => option.value === result.aspectRatio) ?? selectedRatio
    : selectedRatio;

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    const parsedSeed = seed.trim() ? Number(seed.trim()) : undefined;

    if (!trimmedPrompt) {
      setError({ code: null, message: 'Please describe the image you want to create.' });
      return;
    }
    if (trimmedPrompt.length > PROMPT_MAX_LENGTH) {
      setError({ code: null, message: 'Prompt exceeds 1,500 characters.' });
      return;
    }
    if (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 9) {
      setError({ code: null, message: 'Choose between 1 and 9 images.' });
      return;
    }
    if (parsedSeed !== undefined && !Number.isInteger(parsedSeed)) {
      setError({ code: null, message: 'Seed must be a whole number.' });
      return;
    }

    setError(null);
    setActionStatus(null);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await authFetch('/api/minimax/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          aspectRatio,
          n: imageCount,
          seed: parsedSeed,
          promptOptimizer,
          responseFormat: 'url',
        }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json() as Omit<ImageGenerationResult, 'aspectRatio'>;
      const generatedResult = { ...data, aspectRatio };
      setResult(generatedResult);

      try {
        saveHistoryItem({
          type: 'image',
          text: trimmedPrompt,
          imageUrls: data.imageUrls,
          source: 'text-to-image',
          aspectRatio,
          seed: parsedSeed,
          model: 'image-01',
          promptOptimizer,
          ttlExpiry: data.expiresAt,
        });
        setActionStatus('Images generated and saved to Library. MiniMax image URLs expire after 24 hours, so download final assets soon.');
      } catch {
        setActionStatus('Images generated for preview, but browser storage was unavailable. Download final assets now because MiniMax image URLs expire after 24 hours.');
      }
    } catch {
      setError({ code: null, message: 'Failed to generate images. Check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box display="grid" gap={6} width="100%">
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4} flexWrap="wrap">
        <Box maxW="48rem">
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Image Generation</h1>
          <Box color="gray.600" mt={1}>
            Create polished visual assets with MiniMax Image. The app uses URL output for fast preview, download, and Library access.
          </Box>
        </Box>
        <Box border="1px solid" borderColor="blue.100" borderLeft="3px solid" borderLeftColor="blue.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm" maxW="21rem">
          Provider URLs expire after 24 hours. Download final images when you like a result.
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: 'minmax(0, 0.95fr) minmax(0, 1.25fr)' }} gap={6} alignItems="start">
        <Card accent="blue">
          <CardHeader>
            <CardTitle>Creative Brief</CardTitle>
            <CardDescription>
              Be specific about subject, environment, lighting, composition, and style. Better inputs produce more controllable outputs.
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="grid" gap={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Label htmlFor="image-prompt">Prompt</Label>
                <Box as="span" color={remainingCharacters < 0 ? 'red.600' : 'gray.500'} fontSize="sm">
                  {prompt.length}/{PROMPT_MAX_LENGTH}
                </Box>
              </Box>
              <Textarea
                id="image-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.currentTarget.value)}
                disabled={isLoading}
                maxLength={PROMPT_MAX_LENGTH + 100}
                minH="10rem"
                placeholder="Example: A premium studio product photo of emerald headphones on warm marble, softbox lighting, shallow depth of field, refined luxury editorial style."
              />
              <Box color="gray.600" fontSize="sm">
                Include what should be visible and the mood you want. Avoid vague prompts like "make it beautiful".
              </Box>
            </Box>

            <Box display="grid" gap={2}>
              <Label>Aspect Ratio</Label>
              <Box display="grid" gap={2} gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }}>
                {ASPECT_RATIO_OPTIONS.map((option) => {
                  const isSelected = option.value === aspectRatio;
                  return (
                    <Button
                      key={option.value}
                      variant={isSelected ? 'solid' : 'outline'}
                      colorPalette={isSelected ? 'blue' : 'gray'}
                      onClick={() => setAspectRatio(option.value)}
                      disabled={isLoading}
                      style={{ height: 'auto', justifyContent: 'flex-start', padding: '0.75rem' }}
                    >
                      <span style={{ display: 'grid', textAlign: 'left', gap: '0.125rem' }}>
                        <strong>{option.label} ({option.value})</strong>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{option.size} · {option.hint}</span>
                      </span>
                    </Button>
                  );
                })}
              </Box>
            </Box>

            <Box display="grid" gridTemplateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
              <Box display="grid" gap={2}>
                <Label htmlFor="image-count">Images</Label>
                <Input
                  id="image-count"
                  type="number"
                  min={1}
                  max={9}
                  value={imageCount}
                  disabled={isLoading}
                  onChange={(event) => setImageCount(Number(event.currentTarget.value))}
                />
                <Box color="gray.600" fontSize="xs">Generate 1 to 9 variations.</Box>
              </Box>
              <Box display="grid" gap={2}>
                <Label htmlFor="image-seed">Seed (optional)</Label>
                <Input
                  id="image-seed"
                  type="number"
                  inputMode="numeric"
                  value={seed}
                  disabled={isLoading}
                  placeholder="Random"
                  onChange={(event) => setSeed(event.currentTarget.value)}
                />
                <Box color="gray.600" fontSize="xs">Reuse a seed for more reproducible directions.</Box>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} border="1px solid" borderColor="blue.100" borderRadius="lg" p="0.75rem" bg="white">
              <Box>
                <Label htmlFor="prompt-optimizer">Prompt Optimizer</Label>
                <Box color="gray.600" fontSize="sm">Let MiniMax refine your prompt before generation.</Box>
              </Box>
              <Switch checked={promptOptimizer} onChange={setPromptOptimizer} disabled={isLoading} />
            </Box>

            {error && <ErrorDisplay code={error.code ?? null} message={error.message ?? ''} />}
            {actionStatus && !error && (
              <Box border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="green.800" fontSize="sm">
                {actionStatus}
              </Box>
            )}

            <Button onClick={handleGenerate} disabled={isLoading || prompt.trim().length === 0 || prompt.length > PROMPT_MAX_LENGTH} colorPalette="blue">
              {isLoading ? 'Generating images...' : 'Generate Images'}
            </Button>
          </CardContent>
        </Card>

        <Card accent="green" minH="28rem">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.metadata.successCount} generated · ${result.metadata.failedCount} failed · ${resultRatio.label} ${resultRatio.value}`
                : 'Generated images appear here as soon as MiniMax returns URL results.'}
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            {isLoading && (
              <Box border="1px dashed" borderColor="blue.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Creating {imageCount} {imageCount === 1 ? 'image' : 'images'} with MiniMax Image...
              </Box>
            )}

            {!isLoading && !result && (
              <Box border="1px dashed" borderColor="gray.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Start with a clear prompt, choose the frame, then generate. Your results will be saved to Library automatically.
              </Box>
            )}

            {result && (
              <Box display="grid" gap={4} gridTemplateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }}>
                {result.imageUrls.map((url, index) => (
                  <Box key={`${url}-${index}`} border="1px solid" borderColor="green.100" borderRadius="xl" overflow="hidden" bg="white" boxShadow="sm">
                    <img
                      src={url}
                      alt={`Generated image ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', aspectRatio: result.aspectRatio.replace(':', ' / '), objectFit: 'cover', display: 'block', backgroundColor: '#f9fafb' }}
                    />
                    <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} p="0.75rem" flexWrap="wrap">
                      <Box color="gray.600" fontSize="sm">Image {index + 1}</Box>
                      <Box display="flex" gap={2}>
                        <Button variant="outline" colorPalette="blue" size="sm" onClick={() => window.open(url, '_blank')}>
                          Open
                        </Button>
                        <Button colorPalette="green" size="sm" onClick={() => downloadImageUrl(url, `minimax-image-${result.id}-${index + 1}.png`)}>
                          Download
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
