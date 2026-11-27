export const ADMIN_EMAIL = 'jeeyoung.park@external.roche.com';
export const ADMIN_CHAT_URL = 'https://chat.google.com/dm/jeeyoung.park@external.roche.com';

export const ALLOWED_EMAIL_DOMAINS = [
  '@roche.com',
  '@contractors.roche.com',
  '@external.roche.com',
];

export const GOOGLE_CONFIG = {
  SPREADSHEET_1_ID: '1Hdt1G7anVzvLjU4j1QKzdFvh38p85cXr444kYHLpa2Y',
  SPREADSHEET_1_TAB: '병원별담당자',
  SPREADSHEET_2_ID: '1j3eEg6gkyClSLiyuOg10o-cDpIbppjJ0',
  MONDAY_SYNC_SHEET_ID: '1qxgyYOrxNa-0Vj_NpO0E9rsf89BlMMmNrdPkdzpDB9A/edit?gid=0#gid=0',
  DRIVE_FOLDER_NLO: '1b4APWOsFqc303QkHRoV6HBIZK59BnUGB',
  DRIVE_FOLDER_NPLH: '1N5RO1iuuDJAnZQ0AcfH_RZhQwaViDyeU',
  MONDAY_BOARD_ID: '2092966004',
};

export type ProductType = 'nLO' | 'nPO' | 'nPLH' | 'nDP' | 'nQP' | 'nM' | 'nA';

export const PRODUCTS: ProductType[] = ['nLO', 'nPO', 'nPLH', 'nDP', 'nQP', 'nM', 'nA'];

export const PRODUCT_RULES: Record<
  ProductType,
  {
    division: 'CL&P' | 'PL';
    defaultCode: string;
    requiresSize: boolean;
  }
> = {
  nLO: { division: 'CL&P', defaultCode: '9989722001', requiresSize: true },
  nPO: { division: 'CL&P', defaultCode: '10081350001', requiresSize: true },
  nPLH: { division: 'PL', defaultCode: '10151684001', requiresSize: true },
  nDP: { division: 'PL', defaultCode: '10060417001', requiresSize: false },
  nQP: { division: 'CL&P', defaultCode: '10288116001', requiresSize: false },
  nM: { division: 'CL&P', defaultCode: '10107570001', requiresSize: false },
  nA: { division: 'CL&P', defaultCode: '9954309001', requiresSize: true },
};

export const REQUEST_TYPES = [
  {
    id: 1,
    title: '1. 신규 라이센스 신청',
    supportedProducts: 'nLO, nPO, nPLH, nDP, nQP, nM, nA',
    active: true,
    href: '/apply/new',
  },
  {
    id: 2,
    title: '2. 라이센스 변경 (고객명/버전 등)',
    supportedProducts: 'nLO, nPO, nPLH, nDP, nQP, nM, nA',
    active: true,
    href: '/apply/change',
  },
  {
    id: 3,
    title: '3. Cache -> IRIS 업그레이드 신청',
    supportedProducts: 'nLO, nPLH',
    active: true,
    href: '/apply/upgrade',
  },
  {
    id: 4,
    title: '4. 현재 버전 라이센스 파일 요청',
    supportedProducts: 'nLO, nPLH',
    active: true,
    href: '/apply/current-license',
  },
  {
    id: 5,
    title: '5. 기타: 라이센스 관리자에게 직접 문의하기',
    active: false,
  },
];