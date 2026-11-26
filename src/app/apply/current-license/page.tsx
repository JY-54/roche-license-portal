'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  FileKey2,
  ArrowUpRight,
  Info,
} from 'lucide-react';

type TargetProduct = 'nLO' | 'nPLH';

interface IrisSheetRow {
  productCategory: TargetProduct;
  productNameRaw: string;
  endCustomer: string;
  coreSn: string;
  cacheLicenseId: string;
  coresCount: string;
  irisUrl: string;
  irisText: string;
}

export default function CurrentLicenseRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState<'search' | 'cache_confirm' | 'submitted'>('search');

  // 1. 제품 선택 (nLO | nPLH)
  const [product, setProduct] = useState<TargetProduct | ''>('');

  // 2. 시트 조회 및 추천 검색
  const [sheetRows, setSheetRows] = useState<IrisSheetRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRow, setSelectedRow] = useState<IrisSheetRow | null>(null);

  // Cache 파일 요청 제출용 입력값
  const [comment, setComment] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      .slice(0, 12);
  }, [product, searchQuery, sheetRows]);

  const handleProductSelect = (nextProduct: TargetProduct) => {
    setProduct(nextProduct);
    setSearchQuery('');
    setSelectedRow(null);
    setStep('search');
    setComment('');
    setEmailError('');
  };

  const handleSelectRow = (row: IrisSheetRow) => {
    setSelectedRow(row);
    setSearchQuery(`${row.endCustomer} | ${row.coreSn} | ${row.cacheLicenseId}`);
    setShowSuggestions(false);
    setStep('search');
  };

  // Cache 버전일 때 "Yes" 선택 -> 3번 폼(/apply/upgrade)으로 고객 정보와 함께 이동
  const handleGoToIrisUpgrade = () => {
    if (!product || !selectedRow) return;
    const params = new URLSearchParams({
      product,
      customer: selectedRow.endCustomer,
      coreSn: selectedRow.coreSn,
      cacheId: selectedRow.cacheLicenseId,
      cores: selectedRow.coresCount,
    });
    router.push(`/apply/upgrade?${params.toString()}`);
  };

  // Cache 버전일 때 "No, Cache 파일 요청을 저장하겠습니다" 제출
  const handleSubmitCacheRequest = async () => {
    if (!product || !selectedRow) return;

    const trimmedEmail = requesterEmail.trim().toLowerCase();
    const isValidEmail = ALLOWED_EMAIL_DOMAINS.some((d) => trimmedEmail.endsWith(d));

    if (!trimmedEmail || !isValidEmail) {
      setEmailError('로슈 메일 주소(@roche.com / @contractors.roche.com / @external.roche.com)만 신청 가능합니다.');
      return;
    }

    setEmailError('');
    setIsSubmitting(true);

    const todayDate = new Date().toISOString().slice(0, 10);
    const rule = PRODUCT_RULES[product];

    const payload = {
      division: rule.division,
      request_date: todayDate,
      billing_type: 'Cache 파일 요청',
      product_name: product,
      product_code: rule.defaultCode,
      customer_name: selectedRow.endCustomer,
      core_sn: selectedRow.coreSn,
      cache_license_id: selectedRow.cacheLicenseId,
      server_cores: selectedRow.coresCount || null,
      comment: comment.trim() || null,
      source_type: 'cache_file_request',
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
            Cache 버전 라이센스 파일 요청이 접수되었습니다
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            요청 내역이 관리자 시트에 기록되었으며, 담당자에게 알림 메일이 발송되었습니다.
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
                setSelectedRow(null);
                setComment('');
                setStep('search');
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition"
            >
              다른 라이센스 조회하기
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            4. nLO, nPLH 현재 버전 라이센스 파일 요청
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            제품 선택 후 고객명, Core SN 또는 Cache License ID로 검색하시면 현재 IRIS 전환 여부 및 라이센스 파일 링크를 즉시 확인하실 수 있습니다.
          </p>

          <div className="space-y-6">
            {/* 1. 제품 선택 */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                1. 제품 선택 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['nLO', 'nPLH'] as TargetProduct[]).map((p) => (
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
                      ({PRODUCT_RULES[p].division})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 시트 통합 검색 */}
            {product && (
              <div className="border-t border-slate-200 pt-5">
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  2. 고객 및 라이센스 검색 (고객명 / Core SN / Cache License ID) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2.5">
                  검색 후 아래 추천 목록에서 해당 병원을 클릭해주세요.
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
                    placeholder="고객명, Core SN 또는 Cache License ID 입력..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {filteredSuggestions.map((row, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => handleSelectRow(row)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b last:border-b-0 border-slate-100 transition"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">
                                {row.endCustomer || '(고객명 없음)'}{' '}
                                <span className="text-slate-400 mx-1">|</span>
                                <span className="text-blue-700 font-mono">
                                  {row.coreSn || '-'}
                                </span>
                                <span className="text-slate-400 mx-1">|</span>
                                <span className="text-indigo-700 font-mono">
                                  {row.cacheLicenseId || '-'}
                                </span>
                              </span>
                              {row.irisUrl ? (
                                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  IRIS 링크 보유
                                </span>
                              ) : (
                                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  Cache 버전
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* 3. 선택된 행의 I칼럼(IRIS) 하이퍼링크 유무에 따른 분기 결과 */}
            {selectedRow && (
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
                  <p className="font-bold text-slate-800 text-sm mb-1">선택된 라이센스 정보</p>
                  <div>
                    <span className="text-slate-500">고객명: </span>
                    <span className="font-semibold text-slate-900">{selectedRow.endCustomer}</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <span className="text-slate-500">Core SN: </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {selectedRow.coreSn || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Cache License ID: </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {selectedRow.cacheLicenseId || '-'}
                      </span>
                    </div>
                    {selectedRow.coresCount && (
                      <div>
                        <span className="text-slate-500">Cores 수: </span>
                        <span className="font-semibold text-slate-900">
                          {selectedRow.coresCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRow.irisUrl ? (
                  /* Case A: I칼럼에 IRIS 하이퍼링크가 걸려 있는 경우 */
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <FileKey2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <h2 className="text-sm font-bold text-emerald-950">
                          IRIS 버전 라이센스 링크가 등록되어 있습니다
                        </h2>
                        <p className="text-xs text-emerald-800 mt-1">
                          아래 버튼을 클릭하시면 시트(IRIS 열)에 연결된 라이센스 파일 링크로 바로 이동합니다.
                        </p>
                      </div>
                    </div>

                    <a
                      href={selectedRow.irisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
                    >
                      <span className="truncate">
                        {selectedRow.irisText || 'IRIS 라이센스 파일 열기'}
                      </span>
                      <span className="inline-flex items-center gap-1 shrink-0 ml-3">
                        링크 열기
                        <ExternalLink className="w-4 h-4" />
                      </span>
                    </a>
                  </div>
                ) : (
                  /* Case B: I칼럼에 하이퍼링크가 없는 경우 (Cache 버전) */
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-4">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h2 className="text-sm font-bold text-amber-950">
                          해당 라이센스는 현재 Cache 버전입니다. IRIS 업그레이드를 신청할까요?
                        </h2>
                        <p className="text-xs text-amber-800 mt-1">
                          IRIS로 업그레이드를 원하시면 <b>Yes</b>를, 기존 Cache 버전 라이센스 파일이 필요하시면 <b>No</b>를 선택해주세요.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleGoToIrisUpgrade}
                        className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs inline-flex items-center justify-center gap-1.5 transition"
                      >
                        <span>Yes, IRIS 업그레이드 신청</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setStep('cache_confirm')}
                        className={`py-3 px-4 text-sm font-semibold rounded-xl border transition ${
                          step === 'cache_confirm'
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        No, Cache 파일 요청을 저장하겠습니다
                      </button>
                    </div>

                    {/* No 선택 시 나타나는 Cache 파일 요청 접수 및 이메일 인증 폼 */}
                    {step === 'cache_confirm' && (
                      <div className="mt-4 pt-4 border-t border-amber-200 bg-white rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900">
                          Cache 버전 라이센스 파일 요청 접수
                        </h3>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Comment / 전달사항 (선택)
                          </label>
                          <textarea
                            rows={2}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="필요 사유나 참고사항이 있다면 입력해주세요."
                            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            신청자 로슈 이메일 주소 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={requesterEmail}
                            onChange={(e) => setRequesterEmail(e.target.value)}
                            placeholder="name@roche.com"
                            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {emailError && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {emailError}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleSubmitCacheRequest}
                          className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl shadow-xs inline-flex items-center justify-center gap-2 transition"
                        >
                          <Send className="w-4 h-4" />
                          {isSubmitting ? '요청 저장 및 메일 발송 중...' : 'Cache 파일 요청 최종 제출하기'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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
