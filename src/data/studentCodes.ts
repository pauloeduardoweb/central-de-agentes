// Client-safe Access Code utilities for Geração Z Pro
// All key verification occurs securely on the server via /api/verify-code

export function normalizeAccessCode(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

// Lightweight client-side sanity check (does NOT expose key list to browser)
export function isValidStudentCode(value: unknown): boolean {
  const norm = normalizeAccessCode(value);
  return norm.length >= 3;
}

export function isMasterKey(value: unknown): boolean {
  const norm = normalizeAccessCode(value);
  return ['MENTOR-BIGODE', 'BIGODE-MENTOR', 'BIGODE7144', '7144BIGODE'].includes(norm);
}
