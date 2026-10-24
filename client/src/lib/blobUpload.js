import { upload } from '@vercel/blob/client';
import { compressImage } from './imageCompress.js';
import { getCookie } from './api.js';

// Compresses the file in the browser, then uploads it directly to Vercel
// Blob — the file never passes through our own server/serverless function.
// This is what actually fixed "uploads take forever on Vercel": the old
// flow was browser -> our function -> sharp -> Blob, capped at Vercel's
// 4.5MB function body limit and paying for an extra network hop every time.
export async function uploadImage(file) {
  const compressed = await compressImage(file);
  const blob = await upload(compressed.name, compressed, {
    access: 'public',
    handleUploadUrl: '/api/uploads',
    // upload() makes its own fetch call, bypassing our api.js wrapper, so
    // the CSRF header has to be attached here explicitly.
    headers: { 'x-csrf-token': getCookie('bellacasa_csrf') || '' },
  });
  return blob.url;
}
