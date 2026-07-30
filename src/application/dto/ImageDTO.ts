import { z } from 'zod';

export const IMAGE_MODEL = 'image-01' as const;

export const ImageAspectRatioSchema = z.enum([
  '1:1',
  '16:9',
  '4:3',
  '3:2',
  '2:3',
  '3:4',
  '9:16',
  '21:9',
]);

export const ImageResponseFormatSchema = z.literal('url');

const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const REFERENCE_IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/]+={0,2})$/i;

function getReferenceImageByteLength(value: string): number | null {
  const match = REFERENCE_IMAGE_DATA_URL_PATTERN.exec(value);
  if (!match) return null;

  const base64 = match[2] ?? '';
  if (base64.length === 0 || base64.length % 4 !== 0) return null;

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

export const ImageSubjectReferenceSchema = z.object({
  type: z.literal('character'),
  imageFile: z
    .string()
    .refine((value) => REFERENCE_IMAGE_DATA_URL_PATTERN.test(value), 'Reference image must be a JPG, JPEG, or PNG Data URL')
    .refine((value) => {
      const byteLength = getReferenceImageByteLength(value);
      return byteLength !== null && byteLength < MAX_REFERENCE_IMAGE_BYTES;
    }, 'Reference image must be smaller than 10MB'),
});

const ImageDimensionSchema = z
  .number()
  .int('Image dimensions must be whole numbers')
  .min(512, 'Image dimensions must be at least 512px')
  .max(2048, 'Image dimensions must be at most 2048px')
  .refine((value) => value % 8 === 0, 'Image dimensions must be divisible by 8');

export const GenerateImageSchema = z
  .object({
    model: z.literal(IMAGE_MODEL).default(IMAGE_MODEL),
    prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required')
      .max(1500, 'Prompt must be at most 1,500 characters'),
    aspectRatio: ImageAspectRatioSchema.default('1:1'),
    width: ImageDimensionSchema.optional(),
    height: ImageDimensionSchema.optional(),
    responseFormat: ImageResponseFormatSchema.default('url'),
    subjectReference: z.array(ImageSubjectReferenceSchema).min(1).optional(),
    seed: z.number().int('Seed must be a whole number').optional(),
    n: z.number().int('Image count must be a whole number').min(1).max(9).default(1),
    promptOptimizer: z.boolean().default(false),
  })
  .refine((value) => (value.width === undefined) === (value.height === undefined), {
    message: 'Width and height must be provided together',
    path: ['height'],
  });

export type GenerateImageRequest = z.infer<typeof GenerateImageSchema>;

export interface GenerateImageResponse {
  id: string;
  imageUrls: string[];
  metadata: {
    successCount: number;
    failedCount: number;
  };
  expiresAt: number;
}
