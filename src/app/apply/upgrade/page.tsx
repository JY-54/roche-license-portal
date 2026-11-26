'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PRODUCT_RULES,
  ALLOWED_EMAIL_DOMAINS,
  ADMIN_CHAT_URL,
} from '@/lib/constants';
import { fetchJsonp } from '@/lib/jsonp';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Send,
  FolderCheck,
  ExternalLink,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

type IrisProduct = 'nLO' | 'nPLH';

interface IrisSheetRow {
  productCategory: IrisProduct;
  productNameRaw: string;
  endCustomer: string;
  coreSn: string;
  cacheLicenseId: string;
  coresCount: string;
}

interface DriveKeyFile {
  name: string;
  url: string;
  updatedAt: string;
}

interface DriveFolderMatch {
  folderName: string;
  folderUrl: string;
  exactMatch: boolean;
  keyFiles: DriveKeyFile[];
}

export default function IrisUpgradePage() {
  const [step, setStep] = useState<'form' | 'confirm' | 'submitted'>('form');

  // 1. 제품 선택 (nLO | nPLH)
  const [product, setProduct] = useState<IrisProduct | ''>('');

  // 시트 데이터 및 통합 검색어
  const [sheetRows, setSheetRows] = useState<IrisSheetRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 폼 5가지 핵심 정보
  const [customerName, setCustomerName] = useState('');
  const [coreSn, setCoreSn] = useState('');
  const [cacheLicenseId, setCacheLicenseId] = useState('');
  const [serverCores, setServerCores] = useState('');
  const [comment, setComment] = useState('');

  // Google Drive 폴더 & .key 파일 조회 상태
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  const [driveMatches, setDriveMatches] = useState<DriveFolderMatch[]>([]);
  const [driveSearchedFor, setDriveSearchedFor] = useState('');
  const [showOtherDriveMatches, setShowOtherDriveMatches] = useState(false);

  // 제출 및 이메일 검증
  const [requesterEmail, setRequesterEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4번 화면에서 "Yes (IRIS 업그레이드 신청)" 선택 시 전달된 고객 정보 자동 채움
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qProduct = params.get("product");
    const qCustomer = params.get("customer");
    const qCoreSn = params.get("coreSn");
    const qCacheId = params.get("cacheId");
    const qCores = params.get("cores");
    if (qProduct === "nLO" || qProduct === "nPLH") {
      setProduct(qProduct);
      if (qCustomer) setCustomerName(qCustomer);
      if (qCoreSn) setCoreSn(qCoreSn);
      if (qCacheId) setCacheLicenseId(qCacheId);
      if (qCores) setServerCores(qCores);
      if (qCustomer || qCoreSn || qCacheId) {
        setSearchQuery([qCustomer, qCoreSn, qCacheId].filter(Boolean).join(" | "));
      }
    }
  }, []);

  // Sheet1 (B, E~H 컬럼) 로드
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    const token = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
    if (!url) return;

    fetchJsonp<{ rows?: IrisSheetRow[] }>(`${url}?type=iris_sheet&token=${token}`)
      .then((res) => {
        if (res.rows) setSheetRows(res.rows);
      })
      .catch(() => {});
  }, []);

  // 선택된 제품(nLO / nPLH)에 해당하는 시트 행 필터 + E, F, G 통합 검색
  const filteredSuggestions = useMemo(() => {
    if (!product) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return sheetRows
      .filter((r) => r.productCategory === product)
      .filter(
        (r) =>
          r.endCustomer.toLowerCase().includes(q) ||
          r.coreSn.toLowerCase().includes(q) ||
          r.cacheLicenseId.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [product, searchQuery, sheetRows]);

  // Google Drive 폴더 및 .key 파일 검색 실행
  const searchGoogleDriveForCustomer = async (targetProduct: IrisProduct, targetCustomer: string) => {
    const trimmed = targetCustomer.trim();
    if (!trimmed) {
      setDriveMatches([]);
      setDriveSearchedFor('');
      return;
    }

    const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    const token = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
    if (!url) return;

    setIsSearchingDrive(true);
    setDriveSearchedFor(trimmed);
    setShowOtherDriveMatches(false);
    try {
      const res = await fetchJsonp<{ matches?: DriveFolderMatch[] }>(
        `${url}?type=drive_search&token=${token}&product=${encodeURIComponent(
          targetProduct
        )}&q=${encodeURIComponent(trimmed)}`
      );
      setDriveMatches(res.matches || []);
    } catch {
      setDriveMatches([]);
    } finally {
      setIsSearchingDrive(false);
    }
  };

  // 고객명 입력 멈춘 뒤 0.6초 후 자동으로 Google Drive 폴더 조회
  useEffect(() => {
    if (!product || !customerName.trim()) {
      setDriveMatches([]);
      setDriveSearchedFor('');
      return;
    }
    const timer = setTimeout(() => {
      searchGoogleDriveForCustomer(product, customerName);
    }, 600);
    return () => clearTimeout(timer);
  }, [product, customerName]);

  const handleProductSelect = (nextProduct: IrisProduct) => {
    setProduct(nextProduct);
    setSearchQuery('');
    setCustomerName('');
    setCoreSn('');
    setCacheLicenseId('');
    setServerCores('');
    setDriveMatches([]);
    setDriveSearchedFor('');
    setFormError('');
  };

  const handleSelectSuggestion = (row: IrisSheetRow) => {
    setCustomerName(row.endCustomer);
    setCoreSn(row.coreSn);
    setCacheLicenseId(row.cacheLicenseId);
    if (row.coresCount) {
      setServerCores(row.coresCount);
    }
    setSearchQuery(`${row.endCustomer} | ${row.coreSn} | ${row.cacheLicenseId}`);
    setShowSuggestions(false);
    setFormError('');
  };

  const handleProceedToConfirm = () => {
    setFormError('');

    if (!product) {
      setFormError('제품명(nLO 또는 nPLH)을 먼저 선택해주세요.');
      return;
    }
    if (!customerName.trim()) {
      setFormError('고객명을 입력해주세요.');
      return;
    }
    if (!/^\d+$/.test(coreSn.trim())) {
      setFormError('Core SN은 숫자만 입력해주세요.');
      return;
    }
    if (!/^\d+$/.test(cacheLicenseId.trim())) {
      setFormError('Cache License ID는 숫자만 입력해주세요.');
      return;
    }
    if (product === 'nLO' && !serverCores.trim()) {
      setFormError('nLO 제품은 Number of Cores in the Server가 필수 항목입니다.');
      return;
    }

    setStep('confirm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    const trimmedEmail = requesterEmail.trim().toLowerCase();
    const isValidEmail = ALLOWED_EMAIL_DOMAINS.some((d) => trimmedEmail.endsWith(d));

    if (!trimmedEmail || !isValidEmail) {
      setEmailError('로슈 메일 주소(@roche.com / @contractors.roche.com / @external.roche.com)만 신청 가능합니다.');
      return;
    }

    setEmailError('');
    setIsSubmitting(true);

    const todayDate = new Date().toISOString().slice(0, 10);
    const rule = PRODUCT_RULES[product as IrisProduct];

    const payload = {
      division: rule.division,
      request_date: todayDate,
      billing_type: 'IRIS 업그레이드',
      product_name: product,
      product_code: rule.defaultCode,
      customer_name: customerName.trim(),
      core_sn: coreSn.trim(),
      cache_license_id: cacheLicenseId.trim(),
      server_cores: serverCores.trim() || null,
      comment: comment.trim() || null,
      source_type: 'iris_upgrade',
      requester_email: trimmedEmail,
    };

    try {
      const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
      const appsScriptToken = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
      if (!appsScriptUrl) {
        alert('Apps Script URL이 설정되지 않았습니다.');
        setIsSubmitting(false);
        return;
      }

      const encodedData = encodeURIComponent(JSON.stringify(payload));
      const submitRes = await fetchJsonp<{ success?: boolean; error?: string; id?: string }>(
        `${appsScriptUrl}?type=submit&token=${appsScriptToken}&data=${encodedData}`
      );

      if (!submitRes.success) {
        alert(submitRes.error || '시트 저장 및 메일 발송 중 오류가 발생했습니다.');
        setIsSubmitting(false);
        return;
      }

      setStep('submitted');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'submitted') {
    return (
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">
            IRIS 업그레이드 신청이 접수되었습니다
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            신청 내역이 관리자 시트에 기록되었으며, 담당자에게 알림 메일이 발송되었습니다.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
            >
              메인 화면으로 돌아가기
            </Link>
            <button
              type="button"
              onClick={() => {
                setProduct('');
                setSearchQuery('');
                setCustomerName('');
                setCoreSn('');
                setCacheLicenseId('');
                setServerCores('');
                setComment('');
                setDriveMatches([]);
                setStep('form');
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition"
            >
              추가 업그레이드 신청하기
            </button>
          </div>
        </div>
      </main>
    );
  }

  const foldersWithKeys = driveMatches.filter((m) => m.keyFiles.length > 0);
  const exactFoldersWithKeys = foldersWithKeys.filter((m) => m.exactMatch);
  const primaryDriveMatches =
    exactFoldersWithKeys.length > 0 ? exactFoldersWithKeys : foldersWithKeys;
  const secondaryDriveMatches =
    exactFoldersWithKeys.length > 0
      ? foldersWithKeys.filter((m) => !m.exactMatch)
      : [];

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 mb-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          메인으로 돌아가기
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            3. nLO, nPLH Cache → IRIS 업그레이드 신청
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            제품 선택 후 고객명, Core SN 또는 Cache License ID로 검색하시면 기존 정보 자동 입력 및 Google Drive 내 기존 IRIS 라이센스(.key) 보유 여부를 즉시 확인합니다.
          </p>

          {step === 'form' ? (
            <div className="space-y-6">
              {/* 1. 제품 선택 (nLO / nPLH) */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  1. 제품 선택 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['nLO', 'nPLH'] as IrisProduct[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProductSelect(p)}
                      className={`py-3 px-4 rounded-xl text-sm font-bold border transition ${
                        product === p
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p}{' '}
                      <span className="font-normal text-xs opacity-85">
                        ({p === 'nLO' ? 'CL&P / Cores 필수' : 'PL / Cores 선택'})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 통합 추천 검색 (고객명 | Core SN | Cache License ID) */}
              {product && (
                <div className="border-t border-slate-200 pt-5">
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    2. 기존 라이센스 통합 검색 (고객명 / Core SN / Cache License ID)
                  </label>
                  <p className="text-xs text-slate-500 mb-2.5">
                    고객명(한글/영문), Core SN, Cache License ID 중 아무 항목이나 입력하면 추천 목록이 표시됩니다.
                  </p>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      placeholder="예: 서울대병원, 1234, 1234567 등 입력..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredSuggestions.map((row, idx) => (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => handleSelectSuggestion(row)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b last:border-b-0 border-slate-100 transition"
                            >
                              <div className="font-semibold text-slate-900">
                                {row.endCustomer || '(고객명 없음)'}{' '}
                                <span className="text-slate-400 mx-1">|</span>
                                <span className="text-blue-700 font-mono">
                                  {row.coreSn || '-'}
                                </span>
                                <span className="text-slate-400 mx-1">|</span>
                                <span className="text-indigo-700 font-mono">
                                  {row.cacheLicenseId || '-'}
                                </span>
                              </div>
                              {row.coresCount && (
                                <div className="text-xs text-emerald-700 mt-0.5">
                                  등록된 Cores 수: {row.coresCount} (선택 시 자동 입력)
                                </div>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Google Drive 기존 IRIS .key 파일 검색 결과 배너 */}
              {product && customerName.trim() && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FolderCheck className="w-4 h-4 text-blue-600" />
                      Google Drive ({product}) 기존 IRIS 라이센스 파일 조회
                    </span>
                    {isSearchingDrive && (
                      <span className="text-xs text-blue-600 inline-flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        폴더 검색 중...
                      </span>
                    )}
                  </div>

                  {!isSearchingDrive && foldersWithKeys.length > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-bold text-emerald-900">
                        Google Drive에서 일치/유사한 고객명 폴더를 찾았습니다!
                      </p>
                      <p className="text-xs text-emerald-800">
                        고객명 폴더 기준으로 검색된 결과입니다. 해당 폴더 안의 <code className="font-mono">IRIS.key</code> 파일 링크를 클릭해 바로 확인하실 수 있습니다.
                      </p>
                      <div className="space-y-2">
                        {primaryDriveMatches.map((match, idx) => (
                          <div
                            key={idx}
                            className="bg-white border-2 border-emerald-400 rounded-lg p-3 space-y-2 shadow-xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">
                                폴더명: {match.folderName}
                              </span>
                              <a
                                href={match.folderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-blue-600 underline shrink-0 ml-2"
                              >
                                폴더 열기
                              </a>
                            </div>
                            <div className="space-y-1.5">
                              {match.keyFiles.map((kf, fIdx) => (
                                <a
                                  key={fIdx}
                                  href={kf.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                                >
                                  <span className="inline-flex items-center gap-1.5 truncate">
                                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{kf.name}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 shrink-0 ml-2">
                                    링크 열기 ({kf.updatedAt})
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}

                        {secondaryDriveMatches.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setShowOtherDriveMatches((prev) => !prev)}
                              className="w-full py-2 px-3 bg-white/80 hover:bg-white border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 transition flex items-center justify-between"
                            >
                              <span>
                                다른 검색결과 보기 ({secondaryDriveMatches.length}건)
                              </span>
                              <span>{showOtherDriveMatches ? "접기 ▲" : "펼치기 ▼"}</span>
                            </button>

                            {showOtherDriveMatches && (
                              <div className="mt-2 space-y-2">
                                {secondaryDriveMatches.map((match, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white/90 border border-slate-200 rounded-lg p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold text-slate-700">
                                        폴더명: {match.folderName}
                                      </span>
                                      <a
                                        href={match.folderUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-500 hover:text-blue-600 underline shrink-0 ml-2"
                                      >
                                        폴더 열기
                                      </a>
                                    </div>
                                    <div className="space-y-1.5">
                                      {match.keyFiles.map((kf, fIdx) => (
                                        <a
                                          key={fIdx}
                                          href={kf.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-between w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
                                        >
                                          <span className="inline-flex items-center gap-1.5 truncate">
                                            <KeyRound className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{kf.name}</span>
                                          </span>
                                          <span className="inline-flex items-center gap-1 shrink-0 ml-2">
                                            링크 열기 ({kf.updatedAt})
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    !isSearchingDrive &&
                    driveSearchedFor && (
                      <p className="text-xs text-slate-600">
                        Google Drive({product}) 폴더 내에 <b>&ldquo;{driveSearchedFor}&rdquo;</b>와 일치하는 기존 <code className="font-mono">.key</code> 파일이 없습니다. 아래 정보를 확인하신 뒤 업그레이드 신청을 진행해주세요.
                      </p>
                    )
                  )}
                </div>
              )}

              {/* 4. 5가지 필수/선택 입력 폼 */}
              {product && (
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <h2 className="text-sm font-semibold text-slate-800">
                    3. 업그레이드 신청 정보 입력 (추천 검색 선택 시 자동 기입)
                  </h2>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      고객명 (한글 또는 영문) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="예: 서울대학교병원 Seoul National University Hospital"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Core SN (숫자만 입력 가능) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={coreSn}
                        onChange={(e) => setCoreSn(e.target.value.replace(/\D/g, ''))}
                        placeholder="예: 1234"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cache License ID (숫자만 입력 가능) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cacheLicenseId}
                        onChange={(e) => setCacheLicenseId(e.target.value.replace(/\D/g, ''))}
                        placeholder="예: 1234567"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Number of Cores in the Server{' '}
                      {product === 'nLO' ? (
                        <span className="text-red-500">* (nLO 필수 항목)</span>
                      ) : (
                        <span className="text-slate-400 font-normal">(nPLH 선택 항목)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={serverCores}
                      onChange={(e) => setServerCores(e.target.value)}
                      placeholder="ex. 16, 32"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Comment (추가 요청사항 - 선택)
                    </label>
                    <textarea
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="업그레이드 일정이나 담당자에게 전달할 참고사항이 있다면 입력해주세요."
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleProceedToConfirm}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition"
              >
                입력 내용 최종 확인 및 업그레이드 신청하기
              </button>
            </div>
          ) : (
            /* 최종 확인 단계 */
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
                <h2 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">
                  IRIS 업그레이드 신청 내용 최종 확인
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">신청 유형</span>
                  <span className="col-span-2 font-semibold text-blue-700">
                    3. Cache → IRIS 업그레이드 신청
                  </span>

                  <span className="text-slate-500">제품명</span>
                  <span className="col-span-2 font-semibold text-slate-900">
                    {product} ({PRODUCT_RULES[product as IrisProduct]?.division})
                  </span>

                  <span className="text-slate-500">고객명</span>
                  <span className="col-span-2 font-medium text-slate-900">{customerName}</span>

                  <span className="text-slate-500">Core SN</span>
                  <span className="col-span-2 font-mono font-semibold text-slate-900">{coreSn}</span>

                  <span className="text-slate-500">Cache License ID</span>
                  <span className="col-span-2 font-mono font-semibold text-slate-900">
                    {cacheLicenseId}
                  </span>

                  <span className="text-slate-500">Server Cores 수</span>
                  <span className="col-span-2 font-semibold text-slate-900">
                    {serverCores || '-'}
                  </span>

                  {comment.trim() && (
                    <>
                      <span className="text-slate-500">Comment</span>
                      <span className="col-span-2 text-slate-800 whitespace-pre-wrap">
                        {comment}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  신청자 로슈 이메일 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="name@roche.com"
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {emailError && <p className="text-xs text-red-600 mt-1.5">{emailError}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('form')}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  수정하기
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="flex-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-sm inline-flex items-center justify-center gap-2 transition"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? '제출 중...' : '최종 제출하기'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href={ADMIN_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-blue-600"
          >
            문의사항이 있으신가요? 관리자에게 Google Chat으로 문의하기
          </a>
        </div>
      </div>
    </main>
  );
}
