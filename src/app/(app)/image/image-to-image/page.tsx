'use client';

import { useState, type ChangeEvent } from 'react';
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
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_REFERENCE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: 'Square', size: '1024 x 1024', hint: 'Profile and social crops' },
  { value: '16:9', label: 'Widescreen', size: '1280 x 720', hint: 'Hero images' },
  { value: '4:3', label: 'Classic', size: '1152 x 864', hint: 'Editorial frames' },
  { value: '3:2', label: 'Photo', size: '1248 x 832', hint: 'Portrait sessions' },
  { value: '2:3', label: 'Portrait', size: '832 x 1248', hint: 'Posters' },
  { value: '3:4', label: 'Tall card', size: '864 x 1152', hint: 'Profile cards' },
  { value: '9:16', label: 'Story', size: '720 x 1280', hint: 'Mobile stories' },
  { value: '21:9', label: 'Cinematic', size: '1344 x 576', hint: 'Banners' },
] as const;

type AspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number]['value'];

interface ReferenceImage {
  name: string;
  size: number;
  dataUrl: string;
}

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

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function validateReferenceFile(file: File): string | null {
  if (!ALLOWED_REFERENCE_MIME_TYPES.has(file.type)) {
    return 'Reference image must be a JPG, JPEG, or PNG file.';
  }
  if (file.size >= MAX_REFERENCE_IMAGE_BYTES) {
    return `Reference image must be smaller than 10MB. Selected file is ${formatBytes(file.size)}.`;
  }
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read reference image'));
    reader.readAsDataURL(file);
  });
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

export default function ImageToImagePage() {
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageCount, setImageCount] = useState(1);
  const [seed, setSeed] = useState('');
  const [promptOptimizer, setPromptOptimizer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const remainingCharacters = PROMPT_MAX_LENGTH - prompt.length;
  const selectedRatio = ASPECT_RATIO_OPTIONS.find((option) => option.value === aspectRatio) ?? ASPECT_RATIO_OPTIONS[0];
  const resultRatio = result
    ? ASPECT_RATIO_OPTIONS.find((option) => option.value === result.aspectRatio) ?? selectedRatio
    : selectedRatio;

  const handleReferenceImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    setResult(null);
    setActionStatus(null);

    if (!file) {
      setReferenceImage(null);
      return;
    }

    const validationError = validateReferenceFile(file);
    if (validationError) {
      setReferenceImage(null);
      setError({ code: null, message: validationError });
      event.currentTarget.value = '';
      return;
    }

    setIsReadingFile(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setReferenceImage({ name: file.name, size: file.size, dataUrl });
    } catch {
      setReferenceImage(null);
      setError({ code: null, message: 'Could not read the reference image. Choose another file and try again.' });
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    const parsedSeed = seed.trim() ? Number(seed.trim()) : undefined;

    if (!referenceImage) {
      setError({ code: null, message: 'Upload a reference portrait before generating.' });
      return;
    }
    if (!trimmedPrompt) {
      setError({ code: null, message: 'Please describe how MiniMax should transform the reference image.' });
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
          subjectReference: [{ type: 'character', imageFile: referenceImage.dataUrl }],
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
          source: 'image-to-image',
          text: trimmedPrompt,
          imageUrls: data.imageUrls,
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
        <Box maxW="50rem">
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Image to Image</h1>
          <Box color="gray.600" mt={1}>
            Transform a reference portrait with MiniMax Image while keeping uploads and API keys server-safe.
          </Box>
        </Box>
        <Box border="1px solid" borderColor="blue.100" borderLeft="3px solid" borderLeftColor="blue.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm" maxW="24rem">
          Best results come from one clear, front-facing portrait. Generated URL results expire after 24 hours.
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: 'minmax(0, 0.95fr) minmax(0, 1.25fr)' }} gap={6} alignItems="start">
        <Card accent="blue">
          <CardHeader>
            <CardTitle>Reference and Direction</CardTitle>
            <CardDescription>
              Upload a JPG or PNG portrait under 10MB, then describe the transformation, style, composition, and mood.
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="grid" gap={2}>
              <Label htmlFor="reference-image">Reference Image</Label>
              <Input
                id="reference-image"
                type="file"
                accept="image/jpeg,image/png"
                disabled={isLoading || isReadingFile}
                onChange={handleReferenceImageChange}
              />
              <Box color="gray.600" fontSize="sm">
                Use a single front-facing portrait for the most reliable character reference.
              </Box>
            </Box>

            {referenceImage && (
              <Box border="1px solid" borderColor="blue.100" borderRadius="xl" overflow="hidden" bg="white">
                <img
                  src={referenceImage.dataUrl}
                  alt="Reference portrait preview"
                  style={{ width: '100%', maxHeight: '22rem', objectFit: 'contain', display: 'block', backgroundColor: '#f8fafc' }}
                />
                <Box display="flex" justifyContent="space-between" gap={2} p="0.75rem" color="gray.600" fontSize="sm" flexWrap="wrap">
                  <span>{referenceImage.name}</span>
                  <span>{formatBytes(referenceImage.size)}</span>
                </Box>
              </Box>
            )}

            <Box display="grid" gap={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Label htmlFor="image-edit-prompt">Prompt</Label>
                <Box as="span" color={remainingCharacters < 0 ? 'red.600' : 'gray.500'} fontSize="sm">
                  {prompt.length}/{PROMPT_MAX_LENGTH}
                </Box>
              </Box>
              <Textarea
                id="image-edit-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.currentTarget.value)}
                disabled={isLoading}
                maxLength={PROMPT_MAX_LENGTH + 100}
                minH="9rem"
                placeholder="Example: Keep the same person, create a premium editorial portrait with soft studio lighting, navy tailoring, clean beige backdrop, natural skin texture, refined magazine style."
              />
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
                <Label htmlFor="image-edit-count">Images</Label>
                <Input
                  id="image-edit-count"
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
                <Label htmlFor="image-edit-seed">Seed (optional)</Label>
                <Input
                  id="image-edit-seed"
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
                <Label htmlFor="image-edit-prompt-optimizer">Prompt Optimizer</Label>
                <Box color="gray.600" fontSize="sm">Let MiniMax refine the transformation prompt.</Box>
              </Box>
              <Switch checked={promptOptimizer} onChange={setPromptOptimizer} disabled={isLoading} />
            </Box>

            {error && <ErrorDisplay code={error.code ?? null} message={error.message ?? ''} />}
            {actionStatus && !error && (
              <Box border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="green.800" fontSize="sm">
                {actionStatus}
              </Box>
            )}

            <Button onClick={handleGenerate} disabled={isLoading || isReadingFile || !referenceImage || prompt.trim().length === 0 || prompt.length > PROMPT_MAX_LENGTH} colorPalette="blue">
              {isLoading ? 'Generating images...' : isReadingFile ? 'Preparing reference...' : 'Generate Images'}
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
                Creating {imageCount} {imageCount === 1 ? 'image' : 'images'} from your reference portrait...
              </Box>
            )}

            {!isLoading && !result && (
              <Box border="1px dashed" borderColor="gray.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Upload a clean portrait, describe the desired direction, then generate. Results are saved to Library automatically.
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
                        <Button colorPalette="green" size="sm" onClick={() => downloadImageUrl(url, `minimax-image-edit-${result.id}-${index + 1}.png`)}>
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
