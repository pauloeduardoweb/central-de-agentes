// Server-Only Authentication Keys Module
// Contains exactly 4 Master Keys and 200 Student Access Codes for Geração Z Pro

export function normalizeAccessCode(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export const MASTER_KEYS = new Set<string>([
  'MENTOR-BIGODE',
  'BIGODE-MENTOR',
  'BIGODE7144',
  '7144BIGODE',
].map(normalizeAccessCode));

export const STUDENT_KEYS = new Set<string>([
  'GZ-5KRT-SRGB',
  'GZ-93P4-4MYL',
  'GZ-MP6N-HM3Y',
  'GZ-BGV9-LCTC',
  'GZ-74JW-DDUC',
  'GZ-H5HR-B779',
  'GZ-Q9YA-WNFR',
  'GZ-CNB7-X9WW',
  'GZ-67K8-ZCRB',
  'GZ-UG35-52HR',
  'GZ-QN3S-M89L',
  'GZ-45LU-TZW5',
  'GZ-NE8R-QMES',
  'GZ-UHAG-DF6Z',
  'GZ-AMM8-7PHH',
  'GZ-CLNX-R47T',
  'GZ-FZQ5-DYNZ',
  'GZ-BVKT-HFSH',
  'GZ-AQTM-T2J4',
  'GZ-EJY4-BMK6',
  'GZ-WLPQ-4LSY',
  'GZ-FRHP-7F5N',
  'GZ-C4U9-2838',
  'GZ-FF3P-8MU6',
  'GZ-G7GY-2FN5',
  'GZ-Q3F2-35JZ',
  'GZ-NB6Z-AWW7',
  'GZ-GNBU-587Z',
  'GZ-BUKQ-JCVG',
  'GZ-P44U-DJ6S',
  'GZ-FGKG-TXXX',
  'GZ-95M7-JTY3',
  'GZ-26YS-6K87',
  'GZ-YN8S-H9FQ',
  'GZ-CADP-BV9M',
  'GZ-9JXL-XETK',
  'GZ-QKC8-GFL7',
  'GZ-UDB3-VG2Z',
  'GZ-N3FL-6TNC',
  'GZ-W4HC-VNMW',
  'GZ-FAZH-Y52E',
  'GZ-28HN-TLQN',
  'GZ-4LK8-GWCR',
  'GZ-RY7G-NVSB',
  'GZ-87EH-8G24',
  'GZ-ZT7Q-DUFW',
  'GZ-E55Q-FW9R',
  'GZ-2TMY-Y9CT',
  'GZ-YFQJ-WMHZ',
  'GZ-7CM3-BDXU',
  'GZ-Y5EQ-KQ7R',
  'GZ-G2P9-6UWK',
  'GZ-X9JC-GT7U',
  'GZ-VSSZ-RCGR',
  'GZ-LA2N-AVH3',
  'GZ-AK9T-UHD7',
  'GZ-22Z2-4BHZ',
  'GZ-RWCY-53Z5',
  'GZ-VQQF-NJK5',
  'GZ-DHA5-QSF2',
  'GZ-37P7-R33Z',
  'GZ-PUQU-YAFZ',
  'GZ-CLZH-Z665',
  'GZ-7NYK-3DAY',
  'GZ-D827-EAVJ',
  'GZ-ZXQN-87CD',
  'GZ-BXEQ-4BBM',
  'GZ-NJ8Q-T632',
  'GZ-STB5-7R8K',
  'GZ-GPQU-B5U7',
  'GZ-XN2W-JVV4',
  'GZ-XVYV-66Z3',
  'GZ-46CR-JQPU',
  'GZ-XB6X-N5DY',
  'GZ-W47Q-7ZL9',
  'GZ-RXQ5-DQYE',
  'GZ-QRDN-Z4AK',
  'GZ-TKUX-NTUQ',
  'GZ-LURA-FBH7',
  'GZ-CQX5-V8UJ',
  'GZ-ERYG-HUTT',
  'GZ-B99M-M6QQ',
  'GZ-F9TN-QFM8',
  'GZ-BBBN-VKER',
  'GZ-FCPP-S9EV',
  'GZ-KRZY-3SHL',
  'GZ-A8W2-Y5UB',
  'GZ-AZJF-QJEK',
  'GZ-GE73-F32W',
  'GZ-NN6K-X7RU',
  'GZ-48J2-8JF7',
  'GZ-FWMT-LC8P',
  'GZ-2VFS-PL39',
  'GZ-KCMG-UFCV',
  'GZ-HYVC-L48A',
  'GZ-7WMP-EWAH',
  'GZ-8ACZ-4QUV',
  'GZ-4YUV-ZY68',
  'GZ-EHZK-8Z4H',
  'GZ-ULTT-DF3C',
  'GZ-UTP8-L998',
  'GZ-VJMW-MDN5',
  'GZ-8W8P-SXEC',
  'GZ-JYVG-KFBM',
  'GZ-VKMA-UUY7',
  'GZ-V7TX-HKXF',
  'GZ-FRJD-X772',
  'GZ-4C9C-BD5C',
  'GZ-5MU9-JKYR',
  'GZ-9M5W-U6SE',
  'GZ-LZRY-A7EQ',
  'GZ-J8Z9-RPUV',
  'GZ-5YYD-5GLQ',
  'GZ-DS3D-WBU5',
  'GZ-9Z6H-KXN8',
  'GZ-LGJ2-J65C',
  'GZ-Y3C4-YU8X',
  'GZ-4JHA-QUDT',
  'GZ-7NLS-6GEU',
  'GZ-UV24-LMEA',
  'GZ-4H2Y-VFTQ',
  'GZ-LDM4-QHSG',
  'GZ-XEXP-9VT3',
  'GZ-E5TW-8BKU',
  'GZ-47MP-2VHS',
  'GZ-9YCJ-XZ6A',
  'GZ-G3Q7-9GAV',
  'GZ-AMZP-UWZQ',
  'GZ-EXF2-KNTB',
  'GZ-59B2-Z4ZN',
  'GZ-XYGF-TEA5',
  'GZ-UX56-N6N5',
  'GZ-MUNP-H5R7',
  'GZ-R6PU-66NL',
  'GZ-H9QA-EWLE',
  'GZ-AP6G-UP6G',
  'GZ-P4SL-G8TJ',
  'GZ-TP86-W23T',
  'GZ-K3NY-6FEL',
  'GZ-4ENN-XPLW',
  'GZ-7VRP-LHB9',
  'GZ-42AL-82GL',
  'GZ-WB3Y-8R5A',
  'GZ-E4FP-RW84',
  'GZ-HABF-E5AM',
  'GZ-FTXQ-X9VY',
  'GZ-FHYG-4MZT',
  'GZ-RV83-73M2',
  'GZ-GTLJ-S662',
  'GZ-9R5F-VAEC',
  'GZ-CLC9-TDLF',
  'GZ-TFHX-B722',
  'GZ-ACFT-NC5M',
  'GZ-GNCA-C6FB',
  'GZ-EMP6-DNV2',
  'GZ-ZD8L-2V59',
  'GZ-Q5AN-J954',
  'GZ-GHW5-S9XL',
  'GZ-SYY7-UZEF',
  'GZ-2KZV-D974',
  'GZ-WYYW-PNXL',
  'GZ-CU48-KWU7',
  'GZ-RKLK-PUTU',
  'GZ-KYDR-MH28',
  'GZ-7H35-L6QG',
  'GZ-UJX2-T7FR',
  'GZ-TDBW-TXWE',
  'GZ-98DW-3LAV',
  'GZ-B6ME-EVR4',
  'GZ-GYVP-9NKV',
  'GZ-G868-N49W',
  'GZ-YCXS-V69R',
  'GZ-5FA2-2YPF',
  'GZ-3785-JQRL',
  'GZ-2BMK-L5P2',
  'GZ-D4CU-QJPY',
  'GZ-44QL-FAT8',
  'GZ-YRVB-MAAC',
  'GZ-T38T-WKSN',
  'GZ-BU46-P6VS',
  'GZ-A927-SBLA',
  'GZ-SM3P-6UEG',
  'GZ-UBHL-VMWK',
  'GZ-BX7X-6A4S',
  'GZ-7L65-NTMW',
  'GZ-NCSP-RBXG',
  'GZ-SXB7-LCFT',
  'GZ-XQFA-RTYE',
  'GZ-VHW5-5CUJ',
  'GZ-T35H-BFB3',
  'GZ-SP5P-25KS',
  'GZ-QMYW-NBKV',
  'GZ-TLQP-P3YF',
  'GZ-JQ8N-ZQQH',
  'GZ-MSH5-6BYM',
  'GZ-52SB-4W4N',
  'GZ-9FAE-EXX8',
  'GZ-53LL-4AYY',
  'GZ-9ZTR-MGW6',
  'GZ-PLHQ-RKHG',
].map(normalizeAccessCode));

export function verifyLoadedKeysCount(): { masterCount: number; studentCount: number; totalCount: number } {
  const masterCount = MASTER_KEYS.size;
  const studentCount = STUDENT_KEYS.size;
  const totalCount = masterCount + studentCount;

  if (masterCount !== 4 || studentCount !== 200 || totalCount !== 204) {
    const errMsg = `AUTH_CONFIGURATION_ERROR: Esperado 4 chaves mestras e 200 chaves de alunos (total 204). Carregado: ${masterCount} mestras, ${studentCount} alunos, total ${totalCount}.`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return { masterCount, studentCount, totalCount };
}

export type KeyCategory = 'MASTER' | 'STUDENT' | 'INVALID';

export function lookupKeyType(rawCode: unknown): KeyCategory {
  // Confirm config loaded
  verifyLoadedKeysCount();

  const normalized = normalizeAccessCode(rawCode);
  if (!normalized) return 'INVALID';

  // Rule 9: Validation order
  // PRIMEIRO: Verificar se existe em MASTER_KEYS
  if (MASTER_KEYS.has(normalized)) {
    return 'MASTER';
  }

  // SEGUNDO: Verificar se existe em STUDENT_KEYS
  if (STUDENT_KEYS.has(normalized)) {
    return 'STUDENT';
  }

  // TERCEIRO: Código inexistente em ambas
  return 'INVALID';
}

export function isMasterKey(rawCode: unknown): boolean {
  return lookupKeyType(rawCode) === 'MASTER';
}

// Utility to safely format/mask code for server logs (Rule 17)
export function maskCodeForLogs(rawCode: unknown): string {
  const norm = normalizeAccessCode(rawCode);
  if (!norm) return '[EMPTY]';
  if (norm.length <= 6) return norm.slice(0, 2) + '***';
  return norm.slice(0, 3) + '****' + norm.slice(-4);
}
