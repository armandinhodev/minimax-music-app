import { NextResponse } from 'next/server';

import type { FilePurpose } from '@/application/dto/FileDTO';
import {
  ALL_UPLOAD_PURPOSES,
  MAX_MULTIPART_OVERHEAD_BYTES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILE_SIZE_MB,
  UPLOAD_POLICY_BY_PURPOSE,
} from '@/lib/upload-policy';

const AUDIO_PURPOSES = new Set<FilePurpose>(['voice_clone', 'prompt_audio']);
const AUDIO_MIME_TYPES = new Set(
  Array.from(AUDIO_PURPOSES).flatMap((purpose) => UPLOAD_POLICY_BY_PURPOSE[purpose].allowedMimeHints)
);
const TEXT_MIME_TYPE = 'text/plain';
const ZIP_MIME_TYPES = new Set(UPLOAD_POLICY_BY_PURPOSE.t2a_async_input.allowedMimeHints.filter((mime) => mime.includes('zip')));

const AUDIO_EXTENSIONS = new Set(
  Array.from(AUDIO_PURPOSES).flatMap((purpose) => UPLOAD_POLICY_BY_PURPOSE[purpose].allowedExtensions)
);
const ASYNC_INPUT_EXTENSIONS = new Set(UPLOAD_POLICY_BY_PURPOSE.t2a_async_input.allowedExtensions);
const TEXT_EXTENSION = UPLOAD_POLICY_BY_PURPOSE.t2a_async_input.allowedExtensions.find((extension) => extension === '.txt') ?? '.txt';
const ZIP_EXTENSION = UPLOAD_POLICY_BY_PURPOSE.t2a_async_input.allowedExtensions.find((extension) => extension === '.zip') ?? '.zip';

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.toLowerCase().slice(lastDot) : '';
}

function isWavFile(buffer: Uint8Array): boolean {
  return buffer.length >= 12
    && buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
    && buffer[8] === 0x57
    && buffer[9] === 0x41
    && buffer[10] === 0x56
    && buffer[11] === 0x45;
}

function isMp3File(buffer: Uint8Array): boolean {
  return (buffer.length >= 3
    && buffer[0] === 0x49
    && buffer[1] === 0x44
    && buffer[2] === 0x33)
    || (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
}

function isM4aFile(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;

  const boxType = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
  const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);

  return boxType === 'ftyp' && ['M4A ', 'M4B ', 'mp42', 'isom', 'qt  '].includes(brand);
}

function isZipFile(buffer: Uint8Array): boolean {
  return buffer.length >= 4
    && buffer[0] === 0x50
    && buffer[1] === 0x4b
    && [0x03, 0x05, 0x07].includes(buffer[2])
    && [0x04, 0x06, 0x08].includes(buffer[3]);
}

function isLikelyPlainText(buffer: Uint8Array): boolean {
  if (buffer.length === 0) return true;

  let suspiciousByteCount = 0;
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte === 0) return false;
    const isAllowedControl = byte === 0x09 || byte === 0x0a || byte === 0x0d;
    const isPrintableAscii = byte >= 0x20 && byte <= 0x7e;
    const isUtf8LeadOrContinuation = byte >= 0x80;

    if (!isAllowedControl && !isPrintableAscii && !isUtf8LeadOrContinuation) {
      suspiciousByteCount++;
    }
  }

  return suspiciousByteCount / buffer.length < 0.05;
}

export function getContentLengthErrorResponse(contentLengthHeader: string | null) {
  if (!contentLengthHeader) {
    return NextResponse.json({ error: 'Content-Length header is required.' }, { status: 411 });
  }

  const contentLength = Number(contentLengthHeader);
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return NextResponse.json({ error: 'Invalid Content-Length header.' }, { status: 400 });
  }

  if (contentLength > MAX_UPLOAD_FILE_SIZE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum request size is ${MAX_UPLOAD_FILE_SIZE_MB} MB.` },
      { status: 413 }
    );
  }

  return null;
}

export function validateFileForPurpose(
  fileName: string,
  fileType: string,
  fileSize: number,
  fileBytes: Uint8Array,
  purpose: FilePurpose
): string | null {
  const ext = getFileExtension(fileName);

  switch (purpose) {
    case 'voice_clone':
    case 'prompt_audio':
      if (!AUDIO_EXTENSIONS.has(ext)) {
        return `Invalid file type for ${purpose}. Allowed: MP3, M4A, WAV.`;
      }

      if (fileType && !AUDIO_MIME_TYPES.has(fileType)) {
        return `Invalid MIME type for ${purpose}. Allowed: MP3, M4A, WAV audio.`;
      }

      if (
        (ext === '.mp3' && !isMp3File(fileBytes))
        || (ext === '.m4a' && !isM4aFile(fileBytes))
        || (ext === '.wav' && !isWavFile(fileBytes))
      ) {
        return `File content does not match ${ext.slice(1).toUpperCase()} audio.`;
      }
      break;
    case 't2a_async_input':
      if (!ASYNC_INPUT_EXTENSIONS.has(ext)) {
        return `Invalid file type for t2a_async_input. Allowed: ${UPLOAD_POLICY_BY_PURPOSE.t2a_async_input.allowedExtensions.map((extension) => extension.slice(1).toUpperCase()).join(', ')}.`;
      }

      if (ext === TEXT_EXTENSION) {
        if (fileType && fileType !== TEXT_MIME_TYPE) {
          return 'Invalid MIME type for t2a_async_input text uploads. Allowed: text/plain.';
        }
        if (!isLikelyPlainText(fileBytes)) {
          return 'TXT uploads must contain plain text content.';
        }
      }

      if (ext === ZIP_EXTENSION) {
        if (fileType && !ZIP_MIME_TYPES.has(fileType)) {
          return 'Invalid MIME type for t2a_async_input zip uploads. Allowed: ZIP.';
        }
        if (!isZipFile(fileBytes)) {
          return 'ZIP uploads must contain a valid ZIP file.';
        }
      }
      break;
    case 't2a_async':
      break;
  }

  if (fileSize > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return `File too large (${(fileSize / 1024 / 1024).toFixed(2)} MB). Maximum is ${MAX_UPLOAD_FILE_SIZE_MB} MB.`;
  }

  return null;
}

export function isAllowedUploadPurpose(value: string): value is FilePurpose {
  return ALL_UPLOAD_PURPOSES.includes(value as FilePurpose);
}
