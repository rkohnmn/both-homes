/** URL-safe plan links. Nothing is uploaded; the plan lives in the URL hash. */

import { normalizePlan, toShareablePlan } from './state.js';

const MAX_TOKEN_LENGTH = 200_000;

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeToken(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error('That share link is incomplete.');
  }
  const padded = token.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(token.length / 4) * 4,
    '=',
  );
  const bytes = base64ToBytes(padded);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

export function buildShareUrl(plan, options, baseUrl = window.location.href) {
  const shareable = toShareablePlan(plan, options);
  const token = encodeToken(shareable);
  const url = new URL(baseUrl);
  url.hash = `p=${token}`;
  return url.toString();
}

export function planFromHash(hash, { today } = {}) {
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const token = params.get('p');
  if (!token) return null;
  if (token.length > MAX_TOKEN_LENGTH) throw new Error('That share link is too large.');
  let decoded;
  try {
    decoded = decodeToken(token);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('That share link could not be read.');
    throw error;
  }
  return normalizePlan(decoded, { today });
}

export function buildShareUrlFromHash(plan, options, hash) {
  return buildShareUrl(plan, options, hash);
}
