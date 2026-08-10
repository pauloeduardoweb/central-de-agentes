import crypto from 'crypto';

/**
 * Service helpers for TikTok Shop Partner API integration.
 */

export function getTikTokShopAppKey(): string {
  return process.env.TIKTOK_SHOP_APP_KEY || '';
}

export function getTikTokShopAppSecret(): string {
  return process.env.TIKTOK_SHOP_APP_SECRET || '';
}

export function getTikTokShopRedirectUri(): string {
  return process.env.TIKTOK_SHOP_REDIRECT_URI || 'https://app.geracaozpro.com/api/tiktok-shop/callback';
}

/**
 * Generate state token for TikTok Shop OAuth authorization flow.
 */
export function generateTikTokShopState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Helper to validate state token received in callback.
 */
export function validateTikTokShopState(state?: string | null): boolean {
  if (!state) return false;
  return typeof state === 'string' && state.trim().length > 0;
}
