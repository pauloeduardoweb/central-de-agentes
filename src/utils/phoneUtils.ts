/**
 * International Phone Formatting, Parsing, and Validation Utilities
 * Canonical E.164 format stored in database: +5521969931420, +12705326695, +351912345678
 */

export interface Country {
  code: string;       // ISO 2-letter code, e.g. 'BR', 'US', 'PT'
  name: string;       // Name in Portuguese, e.g. 'Brasil'
  dialCode: string;   // Dial code with +, e.g. '+55', '+1'
  flag: string;       // Flag emoji, e.g. '🇧🇷'
  example: string;    // Display example for input placeholder
  minDigits: number;  // Min national digits excluding country dial code
  maxDigits: number;  // Max national digits excluding country dial code
}

export const COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷', example: '(21) 96993-1420', minDigits: 10, maxDigits: 11 },
  { code: 'US', name: 'Estados Unidos / Canadá', dialCode: '+1', flag: '🇺🇸', example: '(270) 532-6695', minDigits: 10, maxDigits: 10 },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', example: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', example: '9 11 1234-5678', minDigits: 10, maxDigits: 11 },
  { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾', example: '981 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸', example: '612 34 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧', example: '7123 456789', minDigits: 10, maxDigits: 10 },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹', example: '312 345 6789', minDigits: 9, maxDigits: 10 },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷', example: '6 12 34 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪', example: '151 12345678', minDigits: 10, maxDigits: 11 },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', example: '55 1234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', example: '9 1234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴', example: '300 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'JP', name: 'Japão', dialCode: '+81', flag: '🇯🇵', example: '90 1234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾', example: '99 123 456', minDigits: 8, maxDigits: 8 },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', example: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'EC', name: 'Equador', dialCode: '+593', flag: '🇪🇨', example: '91 234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', example: '412 1234567', minDigits: 10, maxDigits: 10 },
  { code: 'BO', name: 'Bolívia', dialCode: '+591', flag: '🇧🇴', example: '7123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴', example: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'MZ', name: 'Moçambique', dialCode: '+258', flag: '🇲🇿', example: '82 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'CH', name: 'Suiça', dialCode: '+41', flag: '🇨🇭', example: '79 123 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'AU', name: 'Austrália', dialCode: '+61', flag: '🇦🇺', example: '412 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'NZ', name: 'Nova Zelândia', dialCode: '+64', flag: '🇳🇿', example: '21 123 4567', minDigits: 8, maxDigits: 10 },
  { code: 'IE', name: 'Irlanda', dialCode: '+353', flag: '🇮🇪', example: '83 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'BE', name: 'Bélgica', dialCode: '+32', flag: '🇧🇪', example: '470 12 34 56', minDigits: 9, maxDigits: 9 },
  { code: 'NL', name: 'Holanda', dialCode: '+31', flag: '🇳🇱', example: '6 12345678', minDigits: 9, maxDigits: 9 },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0]; // Brasil (+55)

/**
 * Valid Brazilian DDDs
 */
const VALID_BR_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Clean digits helper
 */
export function onlyDigits(str: string): string {
  return (str || '').replace(/\D/g, '');
}

/**
 * Format national digits for display according to selected country rules
 */
export function formatNationalNumber(country: Country, input: string): string {
  const digits = onlyDigits(input);
  if (!digits) return '';

  if (country.code === 'BR') {
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  if (country.code === 'US') {
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  if (country.code === 'PT') {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  }

  // Generic formatting for other countries (grouping)
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 12)}`;
}

/**
 * Detect country and extract national digits from input string (supports pasted E.164, raw numbers, legacy format)
 */
export function parsePhoneInput(
  rawInput: string,
  currentCountry: Country = DEFAULT_COUNTRY
): { country: Country; nationalDigits: string; formattedNational: string } {
  if (!rawInput) {
    return { country: currentCountry, nationalDigits: '', formattedNational: '' };
  }

  const trimmed = rawInput.trim();
  const digits = onlyDigits(trimmed);

  // Check if starts with explicit '+' or dialCode
  if (trimmed.startsWith('+')) {
    // Search matching country by dial code (longest match first)
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sortedCountries) {
      const dialDigits = onlyDigits(c.dialCode);
      if (digits.startsWith(dialDigits)) {
        const national = digits.slice(dialDigits.length);
        return {
          country: c,
          nationalDigits: national,
          formattedNational: formatNationalNumber(c, national),
        };
      }
    }
  }

  // If no '+', check if number starts with country dial digits (e.g. 5521969931420 or 12705326695)
  // Check Brazil 55...
  if (digits.length >= 12 && digits.startsWith('55')) {
    const brCountry = COUNTRIES.find((c) => c.code === 'BR') || DEFAULT_COUNTRY;
    const national = digits.slice(2, 13);
    return {
      country: brCountry,
      nationalDigits: national,
      formattedNational: formatNationalNumber(brCountry, national),
    };
  }

  // Check US/Canada 1... (10 digits after 1 = 11 digits total)
  if (digits.length === 11 && digits.startsWith('1')) {
    const usCountry = COUNTRIES.find((c) => c.code === 'US') || DEFAULT_COUNTRY;
    const national = digits.slice(1);
    return {
      country: usCountry,
      nationalDigits: national,
      formattedNational: formatNationalNumber(usCountry, national),
    };
  }

  // Fallback: treat as national number under currentCountry
  const nationalDigits = digits.slice(0, currentCountry.maxDigits);
  return {
    country: currentCountry,
    nationalDigits,
    formattedNational: formatNationalNumber(currentCountry, nationalDigits),
  };
}

/**
 * Validate phone number based on selected country
 */
export function validateInternationalPhone(
  country: Country,
  nationalInput: string
): { valid: boolean; error?: string; canonicalE164?: string } {
  const digits = onlyDigits(nationalInput);

  if (!digits || digits.length < country.minDigits) {
    return {
      valid: false,
      error: `Número incompleto para o país selecionado. Exemplo para ${country.name}: ${country.dialCode} ${country.example}`,
    };
  }

  if (digits.length > country.maxDigits + 1) {
    return {
      valid: false,
      error: `Confira o código do país e o telefone. Exemplo para ${country.name}: ${country.dialCode} ${country.example}`,
    };
  }

  // Special validation for Brazil
  if (country.code === 'BR') {
    if (digits.length !== 11) {
      return {
        valid: false,
        error: `Confira o número do Brasil. Exemplo: ${country.dialCode} ${country.example}`,
      };
    }
    const ddd = Number(digits.slice(0, 2));
    const firstCellDigit = digits.charAt(2);

    if (!VALID_BR_DDDS.has(ddd) || firstCellDigit !== '9') {
      return {
        valid: false,
        error: `Informe um DDD e celular brasileiro válido. Exemplo: ${country.dialCode} ${country.example}`,
      };
    }
  }

  const dialClean = onlyDigits(country.dialCode);
  const canonicalE164 = `+${dialClean}${digits}`;

  return {
    valid: true,
    canonicalE164,
  };
}

/**
 * Legacy support wrappers to maintain interface compatibility if needed
 */
export function formatPhoneDisplay(input: string): string {
  const parsed = parsePhoneInput(input);
  return `${parsed.country.dialCode} ${parsed.formattedNational}`.trim();
}

export function normalizePhoneToBackend(input: string): string {
  const parsed = parsePhoneInput(input);
  const val = validateInternationalPhone(parsed.country, parsed.nationalDigits);
  return val.canonicalE164 || `+${onlyDigits(parsed.country.dialCode)}${parsed.nationalDigits}`;
}

export function validatePhone(input: string): { valid: boolean; error?: string; normalized?: string } {
  const parsed = parsePhoneInput(input);
  const val = validateInternationalPhone(parsed.country, parsed.nationalDigits);
  return {
    valid: val.valid,
    error: val.error,
    normalized: val.canonicalE164,
  };
}
