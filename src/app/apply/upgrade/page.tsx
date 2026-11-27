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
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface IrisSheetRow {
  productCategory: 'nLO' | 'nPLH';
  productNameRaw: string;
  endCustomer: string;
  coreSn: string;
  cacheLicenseId: string;
  coresCount: string;
  irisUrl: string;
  irisText: string;
}

const NLO_CORE_OPTIONS = ['16', '32'];

export default function IrisUpgradePage() {
  const [step, setStep] = useState<'form' | 'confirm' | 'submitted'>('form');

  const [product, setProduct] = useState<'nLO' | 'nPLH' | ''>('');
  const [irisRows, setIrisRows] = useState<IrisSheetRow[]>([]);
  const [isSheetReady, setIsSheetReady] = useState(false);

  // 검색 및 선택 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRow, setSelectedRow] = useState<IrisSheetRow | null>(null);

  // 필수 입력값
  const [customerName, setCustomerName] = useState('');
  const [coreSn, setCoreSn] = useState('');
  const [cacheLicenseId, setCacheLicenseId] = useState('');
  const [serverCores, setServerCores] = useState('');
  const [isCustomCores, setIsCustomCores] = useState(false);
  const [comment, setComment] = useState('');

  // 제출 및 이메일 검증
  const [requesterEmail, setRequesterEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    const token = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
    if (!url) return;
    setIsSheetReady(false);
    fetchJsonp<{ rows?: IrisSheetRow[] }>(`${url}?type=iris_sheet&token=${token}`)
      .then((res) => {
        if (res.rows) setIrisRows(res.rows);
      })
      .catch(() => {})
      .finally(() => {
        setIsSheetReady(true);
      });
  }, []);

  const filteredRows = useMemo(() => {
    if (!product) return [];
    const q = searchQuery.trim().toLowerCase();
    const byProduct = irisRows.filter((r) => r.productCategory === product);
    if (!q) return byProduct.slice(0, 12);
    return byProduct
      .filter(
        (r) =>
          r.endCustomer.toLowerCase().includes(q) ||
          r.coreSn.toLowerCase().includes(q) ||
          r.cacheLicenseId.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [product, searchQuery, irisRows]);

  const handleProductSelect = (nextProd: 'nLO' | 'nPLH') => {
    setProduct(nextProd);
    setSelectedRow(null);
    setSearchQuery('');
    setCustomerName('');
    setCoreSn('');
    setCacheLicenseId('');
    setServerCores('');
    setIsCustomCores(false);
    setFormError('');
  };

  const handleSelectRow = (row: IrisSheetRow) => {
    setSelectedRow(row);
    setCustomerName(row.endCustomer);
    setCoreSn(row.coreSn);
    setCacheLicenseId(row.cacheLicenseId);

    // nLO인 경우 시트의 Cores 값이 16 또는 32이면 자동 선택, 그 외에는 직접입력으로 세팅
    if (product === 'nLO') {
      const trimmedCores = (row.coresCount || '').trim();
      setServerCores(trimmedCores);
      setIsCustomCores(trimmedCores !== '' && !NLO_CORE_OPTIONS.includes(trimmedCores));
    } else {
      setServerCores('');
      setIsCustomCores(false);
    }

    setSearchQuery(row.endCustomer);
    setShowSuggestions(false);
    setFormError('');
  };

  const alreadyHasIris = !!(selectedRow && (selectedRow.irisUrl || selectedRow.irisText));

  const handleProceedToConfirm = () => {
    setFormError('');
    if (!product) {
      setFormError('대상 제품(nLO 또는 nPLH)을 선택해주세요.');
      return;
    }
    if (!customerName.trim() || !coreSn.trim() || !cacheLicenseId.trim()) {
      setFormError('병원(고객명), Core SN, Cache License ID를 모두 입력해주세요.');
      return;
    }
    if (product === 'nLO' && !serverCores.trim()) {
      setFormError('Number of Cores in the Server를 선택하거나 입력해주세요.');
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
    const payload = {
      request_category: 'Cache -> IRIS 업그레이드',
      division: PRODUCT_RULES[product as 'nLO' | 'nPLH'].division,
      request_date: todayDate,
      billing_type: 'IRIS업그레이드',
      product_name: product,
      product_code: PRODUCT_RULES[product as 'nLO' | 'nPLH'].defaultCode,
      customer_name: customerName.trim(),
      core_sn: coreSn.trim(),
      cache_license_id: cacheLicenseId.trim(),
      server_cores: product === 'nLO' ? serverCores.trim() : null,
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
      const submitRes = await fetchJsonp<{ success?: boolean; error?: string }>(
        `${appsScriptUrl}?type=submit&token=${appsScriptToken}&data=${encodedData}`
      );
      if (!submitRes.success) {
        alert(submitRes.error || '접수 중 오류가 발생했습니다.');
        setIsSubmitting(false);
        return;
      }

      setStep('submitted');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
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
            Cache → IRIS 업그레이드 신청이 완료되었습니다
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            입력하신 정보가 관리자 시트에 기록되었으며 담당자에게 알림 메일이 발송되었습니다.
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
                setSelectedRow(null);
                setComment('');
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
          <div className="flex items-center gap-2.5 mb-1">
            <RefreshCw className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              3. Cache → IRIS 업그레이드 신청
            </h1>
          </div>
          <p className="text-xs font-medium text-blue-700 mb-2">
            지원 제품: nLO, nPLH
          </p>
          <p className="text-sm text-slate-600 mb-6">
            병원을 선택하면 기존 IRIS 발급 여부를 먼저 확인해 드리며, 미발급 시 업그레이드를 바로 신청할 수 있습니다.
          </p>

          {step === 'form' ? (
            <div className="space-y-6">
              {/* 1. 제품 선택 */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  1. 대상 제품 선택 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['nLO', 'nPLH'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProductSelect(p)}
                      className={`py-3 rounded-xl text-sm font-bold border transition cursor-pointer ${
                        product === p
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p} ({p === 'nLO' ? 'navify Lab Operations' : 'navify Pathology Lab Hub'})
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 병원 검색 및 IRIS 기존 발급 여부 조회 */}
              {product && (
                <div className="border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="block text-sm font-semibold text-slate-800">
                      2. 병원(End Customer) 검색 <span className="text-red-500">*</span>
                    </label>
                    {isSheetReady ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        검색 준비 완료
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        검색 준비중...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onFocus={() => setShowSuggestions(true)}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSelectedRow(null);
                          setShowSuggestions(true);
                        }}
                        placeholder={
                          isSheetReady
                            ? '병원명, Core SN 또는 Cache License ID 검색'
                            : '시트 데이터를 불러오는 중입니다. 잠시만 기다려주세요...'
                        }
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {showSuggestions && filteredRows.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredRows.map((row, idx) => {
                          const hasIris = !!(row.irisUrl || row.irisText);
                          return (
                            <li key={idx}>
                              <button
                                type="button"
                                onClick={() => handleSelectRow(row)}
                                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b last:border-b-0 border-slate-100 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{row.endCustomer}</div>
                                  <div className="text-xs text-slate-500">
                                    Core SN: {row.coreSn || '-'} · Cache ID: {row.cacheLicenseId || '-'}
                                  </div>
                                </div>
                                <span
                                  className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    hasIris
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {hasIris ? 'IRIS 발급완료' : '미발급 (신청가능)'}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* 이미 IRIS 라이센스가 발급된 경우: 안내 및 파일 링크 제공 */}
              {selectedRow && alreadyHasIris && (
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="font-bold text-emerald-950 text-base">
                        해당 병원은 이미 IRIS 라이센스가 발급되어 있습니다!
                      </h2>
                      <p className="text-xs text-emerald-800 mt-1">
                        별도의 업그레이드 신청 없이 아래 링크를 통해 발급된 IRIS 라이센스 파일을 바로 다운로드하실 수 있습니다.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1 text-slate-700">
                    <div>
                      <b>병원명:</b> {selectedRow.endCustomer}
                    </div>
                    <div>
                      <b>Core SN:</b> {selectedRow.coreSn || '-'} / <b>Cache ID:</b>{' '}
                      {selectedRow.cacheLicenseId || '-'}
                    </div>
                  </div>

                  {selectedRow.irisUrl ? (
                    <a
                      href={selectedRow.irisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      발급된 IRIS 라이센스 파일 열기 / 다운로드
                    </a>
                  ) : (
                    <p className="text-xs font-medium text-emerald-900 bg-white px-3 py-2 rounded-lg border border-emerald-200">
                      시트 기록값: {selectedRow.irisText}
                    </p>
                  )}
                </div>
              )}

              {/* IRIS 미발급이거나 신규 직접 입력 시: 업그레이드 신청 양식 표시 */}
              {product && !alreadyHasIris && (
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
                    IRIS 라이센스 미발급 대상입니다. 아래 필수 항목을 확인·입력한 뒤 업그레이드를 신청해주세요.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      병원명 (End Customer) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="병원명 입력"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Core SN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={coreSn}
                        onChange={(e) => setCoreSn(e.target.value)}
                        placeholder="Core SN 입력"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cache License ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cacheLicenseId}
                        onChange={(e) => setCacheLicenseId(e.target.value)}
                        placeholder="Cache License ID 입력"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* nLO 전용: Number of Cores in the Server (16, 32, 직접입력 선택지) */}
                  {product === 'nLO' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Number of Cores in the Server <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {NLO_CORE_OPTIONS.map((opt) => {
                          const selected = !isCustomCores && serverCores === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setIsCustomCores(false);
                                setServerCores(opt);
                              }}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                                selected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            if (!isCustomCores) setServerCores('');
                            setIsCustomCores(true);
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                            isCustomCores
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          직접입력
                        </button>
                      </div>
                      {isCustomCores && (
                        <input
                          type="text"
                          value={serverCores}
                          onChange={(e) => setServerCores(e.target.value)}
                          placeholder="서버 Core 수를 직접 입력하세요"
                          className="mt-2 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Comment (추가 요청사항 - 선택)
                    </label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="업그레이드 예정일이나 전달사항이 있다면 자유롭게 입력해주세요."
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>

                  {formError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleProceedToConfirm}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition cursor-pointer"
                  >
                    입력 내용 최종 확인하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 최종 확인 및 이메일 입력 단계 */
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2.5 text-sm">
                <h2 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">
                  IRIS 업그레이드 신청 내역 확인
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">신청 유형</span>
                  <span className="col-span-2 font-semibold text-blue-700">
                    3. Cache → IRIS 업그레이드
                  </span>

                  <span className="text-slate-500">대상 제품</span>
                  <span className="col-span-2 font-semibold text-slate-900">
                    {product} ({PRODUCT_RULES[product as 'nLO' | 'nPLH']?.division})
                  </span>

                  <span className="text-slate-500">병원명</span>
                  <span className="col-span-2 font-semibold text-slate-900">{customerName}</span>

                  <span className="text-slate-500">Core SN</span>
                  <span className="col-span-2 text-slate-900">{coreSn}</span>

                  <span className="text-slate-500">Cache License ID</span>
                  <span className="col-span-2 text-slate-900">{cacheLicenseId}</span>

                  {product === 'nLO' && (
                    <>
                      <span className="text-slate-500">Server Cores</span>
                      <span className="col-span-2 text-slate-900">{serverCores}</span>
                    </>
                  )}

                  {comment.trim() && (
                    <>
                      <span className="text-slate-500">Comment</span>
                      <span className="col-span-2 text-slate-800 whitespace-pre-wrap">{comment}</span>
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
                  className="flex-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-sm inline-flex items-center justify-center gap-2 transition cursor-pointer"
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