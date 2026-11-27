'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PRODUCTS,
  PRODUCT_RULES,
  ALLOWED_EMAIL_DOMAINS,
  ADMIN_CHAT_URL,
  type ProductType,
} from '@/lib/constants';
import { fetchJsonp } from '@/lib/jsonp';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Send,
  FileEdit,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

interface SheetRow {
  distributorCode: string;
  customerCode: string;
  distributorName: string;
  customerName: string;
}

type GeneralFieldKey = 'customerNameKo' | 'customerNameEn' | 'size' | 'serverCores';
type NdpFieldKey = 'customerNameKo' | 'customerNameEn' | 'size' | 'version';

const GENERAL_FIELDS: { key: GeneralFieldKey; label: string; onlyCoreProducts?: boolean }[] = [
  { key: 'customerNameKo', label: '고객명(한글)' },
  { key: 'customerNameEn', label: '고객명(영문)' },
  { key: 'size', label: 'Size' },
  { key: 'serverCores', label: 'Number of Cores in the Server', onlyCoreProducts: true },
];

const NDP_FIELDS: { key: NdpFieldKey; label: string }[] = [
  { key: 'customerNameKo', label: '고객명(한글)' },
  { key: 'customerNameEn', label: '고객명(영문)' },
  { key: 'size', label: 'Size' },
  { key: 'version', label: '버전' },
];

const PRODUCT_SIZE_OPTIONS: Record<string, string[]> = {
  nLO: ["S", "M"],
  nPO: ["XS", "S"],
  nPLH: ["XS", "S", "M"],
  nQP: ["Plus"],
  nA: ["Intermediate"],
};

export default function ChangeLicensePage() {
  const [step, setStep] = useState<'form' | 'confirm' | 'submitted'>('form');

  // 기본 식별 정보
  const [product, setProduct] = useState<ProductType | ''>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [distributorCode, setDistributorCode] = useState('');
  const [distributorName, setDistributorName] = useState('');
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [isSheetReady, setIsSheetReady] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 변경 항목 선택 & 기존/신규 값
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [oldValues, setOldValues] = useState<Record<string, string>>({});
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [isCustomOldSize, setIsCustomOldSize] = useState(false);
  const [isCustomNewSize, setIsCustomNewSize] = useState(false);

  // nDP 전용 추가 항목
  const [smpNumber, setSmpNumber] = useState('');
  const [existingNdpKey, setExistingNdpKey] = useState('');
  const [newLicenseDuration, setNewLicenseDuration] = useState('');

  // 공통 Comment
  const [comment, setComment] = useState('');

  // 제출 및 이메일 검증
  const [requesterEmail, setRequesterEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isNdp = product === 'nDP';
  const supportsServerCores = product === 'nLO' || product === 'nPLH';

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    const token = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
    if (!url) return;
    setIsSheetReady(false);
    fetchJsonp<{ rows?: SheetRow[] }>(`${url}?type=sheets&token=${token}`)
      .then((res) => {
        if (res.rows) setSheetRows(res.rows);
      })
      .catch(() => {})
      .finally(() => {
        setIsSheetReady(true);
      });
  }, []);

  const filteredSuggestions = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    return sheetRows
      .filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerCode.toLowerCase().includes(q) ||
          r.distributorName.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customerSearch, sheetRows]);

  const handleProductChange = (nextProduct: ProductType) => {
    setProduct(nextProduct);
    setSelectedFields({});
    setOldValues({});
    setNewValues({});
    setIsCustomOldSize(false);
    setIsCustomNewSize(false);
    setSmpNumber('');
    setExistingNdpKey('');
    setNewLicenseDuration('');
    setFormError('');
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
    setFormError('');
  };

  const activeFieldDefs = useMemo(() => {
    if (!product) return [];
    if (isNdp) return NDP_FIELDS;
    return GENERAL_FIELDS.filter((f) => !f.onlyCoreProducts || supportsServerCores);
  }, [product, isNdp, supportsServerCores]);

  const activeSelectedKeys = activeFieldDefs
    .filter((f) => selectedFields[f.key])
    .map((f) => f.key);

  // nDP 신규 고객명(영문) 특수문자 체크 (영문, 숫자, 공백만 허용)
  const hasInvalidEnChars = useMemo(() => {
    if (!isNdp || !selectedFields['customerNameEn']) return false;
    const val = newValues['customerNameEn'] || '';
    return /[^a-zA-Z0-9\s]/.test(val);
  }, [isNdp, selectedFields, newValues]);

  // nDP SMP number (2~5자리 숫자) 체크
  const isValidSmp = /^\d{2,5}$/.test(smpNumber.trim());

  const handleProceedToConfirm = () => {
    setFormError('');

    if (!product) {
      setFormError('변경할 제품(System)을 선택해주세요.');
      return;
    }
    if (!customerName.trim() || !customerCode.trim()) {
      setFormError('대상 고객명과 고객코드를 입력해주세요.');
      return;
    }
    if (activeSelectedKeys.length === 0) {
      setFormError('변경할 항목을 최소 1개 이상 선택해주세요.');
      return;
    }

    for (const key of activeSelectedKeys) {
      const label = activeFieldDefs.find((f) => f.key === key)?.label || key;
      if (!(oldValues[key] || '').trim() || !(newValues[key] || '').trim()) {
        setFormError(`[${label}]의 기존 값과 신규 값을 모두 입력해주세요.`);
        return;
      }
    }

    if (isNdp) {
      if (hasInvalidEnChars) {
        setFormError('nDP 신규 고객명(영문)에는 특수문자를 입력할 수 없습니다. (영문, 숫자, 공백만 허용)');
        return;
      }
      if (!isValidSmp) {
        setFormError('SMP number는 2~5자리 숫자로 입력해주세요.');
        return;
      }
      if (!existingNdpKey.trim()) {
        setFormError('기존 nDP License Key를 입력해주세요.');
        return;
      }
      if (!newLicenseDuration.trim()) {
        setFormError('New License Duration을 입력해주세요.');
        return;
      }
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

    const changeItemsSummary = activeSelectedKeys.map((key) => {
      const label = activeFieldDefs.find((f) => f.key === key)?.label || key;
      return {
        field: label,
        oldValue: (oldValues[key] || '').trim(),
        newValue: (newValues[key] || '').trim(),
      };
    });

    const todayDate = new Date().toISOString().slice(0, 10);

    const payload = {
      request_category: '정보 변경 요청',
      division: PRODUCT_RULES[product as ProductType].division,
      request_date: todayDate,
      billing_type: '정보변경',
      product_name: product,
      product_code: PRODUCT_RULES[product as ProductType].defaultCode,
      distributor_code: distributorCode.trim(),
      distributor_name: distributorName.trim(),
      customer_code: customerCode.trim(),
      customer_name: customerName.trim(),
      size: selectedFields['size'] ? `${oldValues['size']} -> ${newValues['size']}` : null,
      english_customer_name: selectedFields['customerNameEn']
        ? `${oldValues['customerNameEn']} -> ${newValues['customerNameEn']}`
        : null,
      change_items: changeItemsSummary,
      smp_number: isNdp ? smpNumber.trim() : null,
      existing_ndp_key: isNdp ? existingNdpKey.trim() : null,
      new_license_duration: isNdp ? newLicenseDuration.trim() : null,
      comment: comment.trim() || null,
      source_type: 'change_request',
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
          <h1 className="text-2xl font-bold text-slate-900">정보 변경 요청이 접수되었습니다</h1>
          <p className="text-slate-600 text-sm mt-2">
            입력하신 내역이 관리자 시트에 자동 기록되었으며, 담당자에게 알림 메일이 발송되었습니다.
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
                setSelectedFields({});
                setOldValues({});
                setNewValues({});
                setComment('');
                setStep('form');
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition"
            >
              추가 변경 요청하기
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
            <FileEdit className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              2. 라이센스 변경 (고객명/버전 등)
            </h1>
          </div>
          <p className="text-xs font-medium text-blue-700 mb-2">
            지원 제품: nLO, nPO, nPLH, nDP, nQP, nM, nA
          </p>
          <p className="text-sm text-slate-600 mb-6">
            제품을 선택한 뒤 변경이 필요한 항목만 체크하여 기존 정보와 신규 정보를 입력해주세요.
          </p>

          {step === 'form' ? (
            <div className="space-y-6">
              {/* 1. 제품 선택 */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  1. 대상 제품 선택 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {PRODUCTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProductChange(p)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition ${
                        product === p
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {isNdp && (
                  <p className="mt-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                    <b>nDP 전용 양식</b>이 적용되었습니다. 변경 항목 입력 후 하단의 SMP number, 기존 nDP License Key, New License Duration을 추가로 입력해주세요.
                  </p>
                )}
              </div>

              {/* 2. 대상 고객 정보 */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    2. 대상 고객(병원/기관) 정보 <span className="text-red-500">*</span>
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

                <div className="relative mb-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={customerSearch}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowSuggestions(true);
                      }}
                      placeholder={
                        isSheetReady
                          ? '병원명 또는 고객코드 검색 (선택 시 자동 입력)'
                          : '데이터를 불러오는 중입니다. 잠시만 기다려주세요...'
                      }
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {filteredSuggestions.map((row, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerName(row.customerName);
                              setCustomerCode(row.customerCode);
                              setDistributorName(row.distributorName);
                              setDistributorCode(row.distributorCode);
                              setCustomerSearch(row.customerName);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b last:border-b-0 border-slate-100"
                          >
                            <div className="font-semibold text-slate-900">
                              {row.customerName}{' '}
                              <span className="text-xs font-normal text-slate-500">
                                ({row.customerCode})
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              대리점: {row.distributorName} ({row.distributorCode})
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      현재 등록 고객명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="예: 서울대학교병원"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      고객 코드 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder="예: 1234567"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      대리점명 (선택)
                    </label>
                    <input
                      type="text"
                      value={distributorName}
                      onChange={(e) => setDistributorName(e.target.value)}
                      placeholder="대리점명"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      대리점 코드 (선택)
                    </label>
                    <input
                      type="text"
                      value={distributorCode}
                      onChange={(e) => setDistributorCode(e.target.value)}
                      placeholder="대리점 코드"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* 3. 변경 항목 선택 및 기존/신규 입력 */}
              {product && (
                <div className="border-t border-slate-200 pt-5">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    3. 변경할 항목 선택 (중복 선택 가능) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                    {activeFieldDefs.map((field) => {
                      const checked = !!selectedFields[field.key];
                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => toggleField(field.key)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm font-medium transition ${
                            checked
                              ? 'bg-blue-50 border-blue-600 text-blue-900'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="w-4 h-4 accent-blue-600 pointer-events-none"
                          />
                          <span>{field.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 선택된 항목별 기존 / 신규 입력란 */}
                  {activeSelectedKeys.length > 0 && (
                    <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      {activeSelectedKeys.map((key) => {
                        const fieldDef = activeFieldDefs.find((f) => f.key === key)!;
                        const isNdpEnField = isNdp && key === 'customerNameEn';
                        return (
                          <div
                            key={key}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs"
                          >
                            <p className="text-sm font-bold text-slate-800 mb-2.5">
                              {fieldDef.label} 변경 내역
                            </p>
                            {isNdpEnField && (
                              <div className="mb-2.5 flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  주의: nDP <b>신규 고객명(영문)</b>에는 특수문자(-, _, ., &amp;, 괄호 등)가 들어가면 안 됩니다.
                                </span>
                              </div>
                            )}
                            {key === 'size' && product && PRODUCT_SIZE_OPTIONS[product] ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                    기존 Size <span className="text-red-500">*</span>
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {PRODUCT_SIZE_OPTIONS[product].map((opt) => {
                                      const active = !isCustomOldSize && oldValues['size'] === opt;
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => {
                                            setIsCustomOldSize(false);
                                            setOldValues((prev) => ({ ...prev, size: opt }));
                                          }}
                                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                                            active
                                              ? 'bg-slate-800 border-slate-800 text-white'
                                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCustomOldSize(true);
                                        if (PRODUCT_SIZE_OPTIONS[product].includes(oldValues['size'] || '')) {
                                          setOldValues((prev) => ({ ...prev, size: '' }));
                                        }
                                      }}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                                        isCustomOldSize
                                          ? 'bg-slate-800 border-slate-800 text-white'
                                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      직접입력
                                    </button>
                                  </div>
                                  {isCustomOldSize && (
                                    <input
                                      type="text"
                                      value={oldValues['size'] || ''}
                                      onChange={(e) =>
                                        setOldValues((prev) => ({ ...prev, size: e.target.value }))
                                      }
                                      placeholder="기존 Size 직접 입력"
                                      className="mt-2 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                                    />
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-blue-700 mb-1.5">
                                    신규 Size <span className="text-red-500">*</span>
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {PRODUCT_SIZE_OPTIONS[product].map((opt) => {
                                      const active = !isCustomNewSize && newValues['size'] === opt;
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => {
                                            setIsCustomNewSize(false);
                                            setNewValues((prev) => ({ ...prev, size: opt }));
                                          }}
                                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                                            active
                                              ? 'bg-blue-600 border-blue-600 text-white'
                                              : 'bg-white border-blue-300 text-blue-800 hover:bg-blue-50'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCustomNewSize(true);
                                        if (PRODUCT_SIZE_OPTIONS[product].includes(newValues['size'] || '')) {
                                          setNewValues((prev) => ({ ...prev, size: '' }));
                                        }
                                      }}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                                        isCustomNewSize
                                          ? 'bg-blue-600 border-blue-600 text-white'
                                          : 'bg-white border-blue-300 text-blue-800 hover:bg-blue-50'
                                      }`}
                                    >
                                      직접입력
                                    </button>
                                  </div>
                                  {isCustomNewSize && (
                                    <input
                                      type="text"
                                      value={newValues['size'] || ''}
                                      onChange={(e) =>
                                        setNewValues((prev) => ({ ...prev, size: e.target.value }))
                                      }
                                      placeholder="신규 Size 직접 입력"
                                      className="mt-2 w-full px-3 py-2 text-sm border border-blue-300 rounded-lg"
                                    />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">
                                    기존 {fieldDef.label} <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={oldValues[key] || ''}
                                    onChange={(e) =>
                                      setOldValues((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    placeholder={`기존 ${fieldDef.label} 입력`}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-blue-700 mb-1">
                                    신규 {fieldDef.label} <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={newValues[key] || ''}
                                    onChange={(e) =>
                                      setNewValues((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    placeholder={`변경할 신규 ${fieldDef.label} 입력`}
                                    className={`w-full px-3 py-2 text-sm border rounded-lg ${
                                      isNdpEnField && hasInvalidEnChars
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-blue-300'
                                    }`}
                                  />
                                  {isNdpEnField && hasInvalidEnChars && (
                                    <p className="text-xs text-red-600 mt-1">
                                      특수문자가 포함되어 있습니다. 영문과 숫자, 공백만 입력해주세요.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. nDP 전용 추가 정보 섹션 */}
              {isNdp && (
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-4">
                    <h2 className="text-sm font-bold text-indigo-950">
                      4. nDP 라이센스 재발급 추가 필수 정보
                    </h2>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        SMP number (2~5자리 숫자) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        value={smpNumber}
                        onChange={(e) => setSmpNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="예: 1234 (2~5자리 숫자만 입력)"
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        기존 nDP License Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={existingNdpKey}
                        onChange={(e) => setExistingNdpKey(e.target.value)}
                        placeholder="기존 발급된 nDP License Key 입력"
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New License Duration <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLicenseDuration}
                        onChange={(e) => setNewLicenseDuration(e.target.value)}
                        placeholder="예: 1 year / 2027-12-31 등"
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Comment 자유 요청사항 */}
              {product && (
                <div className="border-t border-slate-200 pt-5">
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {isNdp ? '5.' : '4.'} Comment (요청사항 자유 기재)
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="변경 사유나 담당자에게 전달할 추가 요청사항이 있다면 자유롭게 작성해주세요."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                입력 내용 최종 확인하기
              </button>
            </div>
          ) : (
            /* 최종 확인 및 이메일 입력 단계 */
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
                <h2 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">
                  변경 요청 내용 최종 확인
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">신청 유형</span>
                  <span className="col-span-2 font-semibold text-blue-700">
                    2. 라이센스 변경 (고객명/버전 등)
                  </span>

                  <span className="text-slate-500">대상 제품</span>
                  <span className="col-span-2 font-semibold text-slate-900">
                    {product} ({PRODUCT_RULES[product as ProductType]?.division})
                  </span>

                  <span className="text-slate-500">대상 고객</span>
                  <span className="col-span-2 font-medium text-slate-900">
                    {customerName} ({customerCode})
                  </span>

                  {distributorName && (
                    <>
                      <span className="text-slate-500">대리점</span>
                      <span className="col-span-2 text-slate-800">
                        {distributorName} {distributorCode ? `(${distributorCode})` : ''}
                      </span>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="font-semibold text-slate-800 mb-2">선택한 변경 내역</p>
                  <div className="space-y-2">
                    {activeSelectedKeys.map((key) => {
                      const label = activeFieldDefs.find((f) => f.key === key)?.label || key;
                      return (
                        <div
                          key={key}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                        >
                          <span className="font-bold text-slate-800">{label}: </span>
                          <span className="text-slate-500 line-through mr-1.5">
                            {oldValues[key]}
                          </span>
                          <span className="text-blue-700 font-semibold">→ {newValues[key]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isNdp && (
                  <div className="border-t border-slate-200 pt-3 grid grid-cols-3 gap-2 text-xs">
                    <span className="text-slate-500">SMP number</span>
                    <span className="col-span-2 font-semibold text-slate-900">{smpNumber}</span>

                    <span className="text-slate-500">기존 nDP Key</span>
                    <span className="col-span-2 font-mono text-slate-900 break-all">
                      {existingNdpKey}
                    </span>

                    <span className="text-slate-500">New Duration</span>
                    <span className="col-span-2 font-semibold text-slate-900">
                      {newLicenseDuration}
                    </span>
                  </div>
                )}

                {comment.trim() && (
                  <div className="border-t border-slate-200 pt-3">
                    <span className="text-slate-500 block text-xs mb-1">Comment</span>
                    <p className="bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 whitespace-pre-wrap text-xs">
                      {comment}
                    </p>
                  </div>
                )}
              </div>

              {/* 신청자 로슈 메일 입력 */}
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