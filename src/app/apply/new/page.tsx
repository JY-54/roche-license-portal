'use client';

import { useState, useEffect } from 'react';
import {
  PRODUCTS,
  PRODUCT_RULES,
  ProductType,
  ALLOWED_EMAIL_DOMAINS,
  ADMIN_CHAT_URL,
} from '@/lib/constants';
import { fetchMondayItems, type MondayItemParsed } from '@/lib/monday';
import { fetchJsonp } from '@/lib/jsonp';
import { fetchCustomerSheetData, type SheetRowParsed } from '@/lib/google-sheets';
import { CheckCircle2, MessageCircle, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PRODUCT_SIZE_OPTIONS: Record<string, string[]> = {
  nLO: ["S", "M"],
  nPO: ["XS", "S"],
  nPLH: ["XS", "S", "M"],
  nQP: ["Plus"],
  nA: ["Intermediate"],
};

export default function NewLicenseApplyPage() {
  const [product, setProduct] = useState<ProductType | ''>('');
  const [comment, setComment] = useState('');
  const [subProductName, setSubProductName] = useState('');
  const [labId, setLabId] = useState('');
  const [billingType, setBillingType] = useState<'과금' | '데모' | ''>('');
  const [hasMondayInfo, setHasMondayInfo] = useState<'Yes' | 'No' | ''>('');

  const [distributorCode, setDistributorCode] = useState('');
  const [distributorName, setDistributorName] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [size, setSize] = useState('');
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [englishCustomerName, setEnglishCustomerName] = useState('');

  const [mondayItems, setMondayItems] = useState<MondayItemParsed[]>([]);
  const [sheetRows, setSheetRows] = useState<SheetRowParsed[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [searchDistCode, setSearchDistCode] = useState('');
  const [searchDistName, setSearchDistName] = useState('');
  const [searchCustCode, setSearchCustCode] = useState('');
  const [searchCustName, setSearchCustName] = useState('');

  const [mondayCustSearch, setMondayCustSearch] = useState('');
  const [mondayDistSearch, setMondayDistSearch] = useState('');

  const [isSummaryStep, setIsSummaryStep] = useState(false);
  const [requesterEmail, setRequesterEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!product) return;
    setSubProductName('');
    setLabId('');
    setSize('');
    setIsCustomSize(false);
    setEnglishCustomerName('');
    setProductCode(PRODUCT_RULES[product].defaultCode);
  }, [product]);

  useEffect(() => {
    if (product === 'nDP' && hasMondayInfo === 'No') {
      if (subProductName.trim().length > 0) {
        setProductCode('');
      } else {
        setProductCode(PRODUCT_RULES.nDP.defaultCode);
      }
    }
  }, [product, subProductName, hasMondayInfo]);

  useEffect(() => {
    if (hasMondayInfo === 'Yes' && mondayItems.length === 0) {
      setLoadingData(true);
      fetchMondayItems().then((items) => setMondayItems(items)).finally(() => setLoadingData(false));
    } else if (hasMondayInfo === 'No' && sheetRows.length === 0) {
      setLoadingData(true);
      fetchCustomerSheetData().then((rows) => setSheetRows(rows)).finally(() => setLoadingData(false));
    }
  }, [hasMondayInfo, mondayItems.length, sheetRows.length]);

  const handleEnglishNameChange = (val: string) => {
    const sanitized = val.replace(/[^a-zA-Z0-9\s]/g, '');
    setEnglishCustomerName(sanitized);
  };

  const selectMondayItem = (item: MondayItemParsed) => {
    setCustomerName(item.customerNameKo);
    setMondayCustSearch(item.customerNameKo);
    setDistributorName(item.distributorName);
    setMondayDistSearch(item.distributorName);
    setDistributorCode(item.distributorCode);
    setCustomerCode(item.customerCode);
    if (item.productCode) setProductCode(item.productCode);
    if (item.subscriptionFee) setMonthlyFee(item.subscriptionFee);
    if (product && PRODUCT_RULES[product].requiresSize && item.size) {
      setSize(item.size);
      const opts = PRODUCT_SIZE_OPTIONS[product] || [];
      setIsCustomSize(opts.length > 0 && !opts.includes(item.size));
    }
    if (product === 'nDP' && item.customerNameEn) {
      setEnglishCustomerName(item.customerNameEn.replace(/[^a-zA-Z0-9\s]/g, ''));
    }
  };

  const selectSheetDistributor = (row: SheetRowParsed) => {
    setDistributorCode(row.distributorCode);
    setDistributorName(row.distributorName);
    setSearchDistCode(row.distributorCode);
    setSearchDistName(row.distributorName);
  };

  const selectSheetCustomer = (row: SheetRowParsed) => {
    setCustomerCode(row.customerCode);
    setCustomerName(row.customerName);
    setSearchCustCode(row.customerCode);
    setSearchCustName(row.customerName);
  };

  const handleProceedToSummary = () => {
    if (!product) return alert('제품을 선택해주세요.');
    if (product === 'nQP' && !labId.trim()) return alert('nQP 제품은 Lab ID가 필수입니다.');
    if (!billingType) return alert('과금 또는 데모를 선택해주세요.');
    if (!hasMondayInfo) return alert('먼데이닷컴 정보 기재 여부를 선택해주세요.');
    if (!distributorCode || !distributorName || !customerCode || !customerName) {
      return alert('대리점 및 고객 정보를 추천 목록에서 선택하여 모두 입력해주세요.');
    }
    if (!productCode.trim()) return alert('제품번호를 입력해주세요.');
    if (PRODUCT_RULES[product].requiresSize && !size.trim()) {
      return alert('Size를 입력해주세요.');
    }
    if (product === 'nDP' && !englishCustomerName.trim()) {
      return alert('nDP 제품은 영문 고객명이 필수입니다.');
    }
    setIsSummaryStep(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    const trimmedEmail = requesterEmail.trim().toLowerCase();
    const isValid = ALLOWED_EMAIL_DOMAINS.some((domain) => trimmedEmail.endsWith(domain));

    if (!trimmedEmail || !isValid) {
      setEmailError('로슈 메일 주소만 신청 가능합니다.');
      return;
    }

    setEmailError('');
    setIsSubmitting(true);

    const payload = {
      division: PRODUCT_RULES[product as ProductType].division,
      request_date: todayDate,
      billing_type: billingType,
      product_name: product,
      product_code: productCode.trim(),
      distributor_code: distributorCode,
      distributor_name: distributorName,
      customer_code: customerCode,
      customer_name: customerName,
      monthly_fee: monthlyFee.trim() || null,
      size: PRODUCT_RULES[product as ProductType].requiresSize ? size.trim() : null,
      english_customer_name: product === 'nDP' ? englishCustomerName.trim() : null,
      lab_id: product === 'nQP' ? labId.trim() : null,
      sub_product_name: product === 'nDP' && subProductName.trim() ? subProductName.trim() : null,
      comment: comment.trim() || null,
      source_type: hasMondayInfo === 'Yes' ? 'monday' : 'sheets',
      requester_email: trimmedEmail,
    };

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "신청 처리 중 오류가 발생했습니다.");
        setIsSubmitting(false);
        return;
      }

      const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
      const appsScriptToken = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
      if (!appsScriptUrl) {
        alert("Apps Script URL이 설정되지 않았습니다.");
        setIsSubmitting(false);
        return;
      }

      const encodedData = encodeURIComponent(JSON.stringify(payload));
      const submitRes = await fetchJsonp<{ success?: boolean; error?: string; id?: string }>(
        `${appsScriptUrl}?type=submit&token=${appsScriptToken}&data=${encodedData}`
      );
      if (!submitRes.success) {
        alert(submitRes.error || "시트 저장 및 메일 발송 중 오류가 발생했습니다.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setIsSubmitting(false);
      return;

      if (!res.ok) {
        alert(result.error || '제출에 실패했습니다.');
      } else {
        setIsSubmitted(true);
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">라이센스 신청이 완료되었습니다</h2>
          <p className="text-sm text-slate-600 mt-2">
            라이센스 관리자에게 알림이 발송되었습니다. 검수 완료 후 입력하신{' '}
            <strong className="text-slate-900">{requesterEmail}</strong> 주소로 회신됩니다.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            메인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (isSummaryStep && product) {
    const division = PRODUCT_RULES[product].division;
    return (
      <main className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <button
            type="button"
            onClick={() => setIsSummaryStep(false)}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> 이전 단계로 수정하기
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">신청 내역 최종 확인</h1>
          <p className="text-sm text-slate-600 mb-6">
            입력하신 내용을 확인하신 후 아래 이메일 주소를 입력하여 최종 제출해주세요.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 grid grid-cols-3 gap-y-2.5 text-sm">
            <span className="text-slate-500">사업부 / 제품</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {division} / {product} ({productCode})
            </span>

            <span className="text-slate-500">신청일</span>
            <span className="col-span-2 text-slate-900">{todayDate}</span>

            <span className="text-slate-500">과금 / 데모</span>
            <span className="col-span-2 text-slate-900">{billingType}</span>

            <span className="text-slate-500">대리점</span>
            <span className="col-span-2 text-slate-900">
              {distributorName} ({distributorCode})
            </span>

            <span className="text-slate-500">고객</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {customerName} ({customerCode})
            </span>

            {englishCustomerName && (
              <>
                <span className="text-slate-500">영문 고객명</span>
                <span className="col-span-2 text-slate-900">{englishCustomerName}</span>
              </>
            )}

            {size && (
              <>
                <span className="text-slate-500">Size</span>
                <span className="col-span-2 text-slate-900">{size}</span>
              </>
            )}

            {monthlyFee && (
              <>
                <span className="text-slate-500">월 금액</span>
                <span className="col-span-2 text-slate-900">{monthlyFee}</span>
              </>
            )}

            {comment.trim() && (
              <>
                <span className="text-slate-500">Comment</span>
                <span className="col-span-2 text-slate-800 whitespace-pre-wrap">{comment}</span>
              </>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              라이센스를 회신받을 이메일 주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="name@roche.com"
              value={requesterEmail}
              onChange={(e) => {
                setRequesterEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600"
            />
            <p className="text-xs text-slate-500 mt-1">
              허용 도메인: @roche.com, @contractors.roche.com, @external.roche.com
            </p>
            {emailError && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">{emailError}</p>
            )}
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinalSubmit}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            {isSubmitting ? '제출 중...' : '최종 제출하기'}
          </button>

          <FooterContact />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> 메인으로
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">신규 라이센스 신청</h1>

        <section className="mb-6">
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Step 1. 제품 선택 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProduct(p)}
                className={`py-2.5 rounded-lg text-sm font-semibold border transition cursor-pointer ${
                  product === p
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        {product === 'nDP' && (
          <section className="mb-6 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              세부 제품명 (선택 입력)
            </label>
            <input
              type="text"
              placeholder="예: Ki-67 (30-9) ALGO BREAST IVD"
              value={subProductName}
              onChange={(e) => setSubProductName(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            />
          </section>
        )}

        {product === 'nQP' && (
          <section className="mb-6 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              Lab ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Lab ID를 입력하세요"
              value={labId}
              onChange={(e) => setLabId(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            />
          </section>
        )}

        {product && (
          <section className="mb-6">
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Step 3. 과금 / 데모 선택 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['과금', '데모'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setBillingType(type);
                    if (type === '데모' && !monthlyFee) setMonthlyFee('0');
                  }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition cursor-pointer ${
                    billingType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>
        )}

        {billingType && (
          <section className="mb-8">
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Step 4. 먼데이닷컴에 해당 건 정보가 기재되어 있나요? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Yes', 'No'] as const).map((ans) => (
                <button
                  key={ans}
                  type="button"
                  onClick={() => {
                    setHasMondayInfo(ans);
                    setDistributorCode('');
                    setDistributorName('');
                    setCustomerCode('');
                    setCustomerName('');
                  }}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition cursor-pointer ${
                    hasMondayInfo === ans
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {ans} ({ans === 'Yes' ? '먼데이닷컴 자동완성' : '직접 검색 입력'})
                </button>
              ))}
            </div>
          </section>
        )}

        {hasMondayInfo === 'Yes' && (
          <div className="space-y-5 border-t border-slate-200 pt-6">
            <div className="bg-slate-100 px-4 py-2.5 rounded-lg text-xs text-slate-700">
              먼데이닷컴 <strong>Pending</strong> 그룹 항목을 실시간으로 검색합니다.
              {loadingData && ' (데이터 불러오는 중...)'}
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                고객명 검색 (한국어 기준) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="병원/고객명을 입력하세요"
                  value={mondayCustSearch}
                  onChange={(e) => setMondayCustSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              {mondayCustSearch && mondayCustSearch !== customerName && (
                <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-md max-h-48 overflow-y-auto divide-y">
                  {mondayItems
                    .filter((i) => { const q = mondayCustSearch.trim().toLowerCase(); return (i.customerNameKo || "").toLowerCase().includes(q) || (i.customerNameEn || "").toLowerCase().includes(q); })
                    .map((item) => (
                      <li
                        key={item.id}
                        onClick={() => selectMondayItem(item)}
                        className="px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer"
                      >
                        {item.customerNameKo} | {item.distributorName} | {item.productName}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                대리점명 검색 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="대리점명을 입력하세요"
                value={mondayDistSearch}
                onChange={(e) => setMondayDistSearch(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {mondayDistSearch && mondayDistSearch !== distributorName && (
                <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-md max-h-48 overflow-y-auto divide-y">
                  {mondayItems
                    .filter((i) =>
                      (i.distributorName || "").toLowerCase().includes(mondayDistSearch.trim().toLowerCase())
                    )
                    .map((item) => (
                      <li
                        key={item.id}
                        onClick={() => selectMondayItem(item)}
                        className="px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer"
                      >
                        {item.distributorName} | {item.customerNameKo} | {item.productName}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">대리점번호</span>
                <input
                  type="text"
                  value={distributorCode}
                  onChange={(e) => setDistributorCode(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">고객번호</span>
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">제품번호</span>
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">월금액 (선택)</span>
                <input
                  type="text"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            {product && PRODUCT_RULES[product].requiresSize && PRODUCT_SIZE_OPTIONS[product] && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Size <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_SIZE_OPTIONS[product].map((opt) => {
                    const selected = !isCustomSize && size === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setIsCustomSize(false);
                          setSize(opt);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCustomSize) setSize("");
                      setIsCustomSize(true);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                      isCustomSize
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    직접 입력
                  </button>
                </div>
                {isCustomSize && (
                  <input
                    type="text"
                    placeholder="Size를 직접 입력하세요"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                )}
              </div>
            )}

            {product === 'nDP' && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  영문 고객명 (특수문자 입력 불가) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={englishCustomerName}
                  onChange={(e) => handleEnglishNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            )}
          </div>
        )}

        {hasMondayInfo === 'No' && (
          <div className="space-y-5 border-t border-slate-200 pt-6">
            <div className="bg-amber-50 px-4 py-2.5 rounded-lg text-xs text-amber-800 border border-amber-200">
              모든 대리점/고객 항목은 입력 후 나타나는 <strong>추천 검색어를 반드시 클릭</strong>하여 선택해야 입력이 완료됩니다.
              {loadingData && ' (데이터 불러오는 중...)'}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                대리점번호 (정확 일치 검색) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="대리점번호를 정확히 입력하세요"
                value={searchDistCode}
                onChange={(e) => {
                  setSearchDistCode(e.target.value);
                  setDistributorCode('');
                }}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {searchDistCode && !distributorCode && (
                <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-md max-h-40 overflow-y-auto divide-y">
                  {Array.from(
                    new Map(
                      sheetRows
                        .filter((r) => r.distributorCode === searchDistCode.trim())
                        .map((r) => [r.distributorCode, r])
                    ).values()
                  ).map((row) => (
                    <li
                      key={row.distributorCode}
                      onClick={() => selectSheetDistributor(row)}
                      className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      {row.distributorCode} | {row.distributorName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                대리점명 (유사 검색) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="대리점명을 입력하세요"
                value={searchDistName}
                onChange={(e) => {
                  setSearchDistName(e.target.value);
                  setDistributorName('');
                }}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {searchDistName && !distributorName && (
                <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-md max-h-40 overflow-y-auto divide-y">
                  {Array.from(
                    new Map(
                      sheetRows
                        .filter((r) =>
                          r.distributorName.toLowerCase().includes(searchDistName.toLowerCase())
                        )
                        .map((r) => [r.distributorCode + r.distributorName, r])
                    ).values()
                  ).map((row, idx) => (
                    <li
                      key={idx}
                      onClick={() => selectSheetDistributor(row)}
                      className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      {row.distributorCode} | {row.distributorName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                고객번호 (정확 일치 검색) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="고객번호를 정확히 입력하세요"
                value={searchCustCode}
                onChange={(e) => {
                  setSearchCustCode(e.target.value);
                  setCustomerCode('');
                }}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {searchCustCode && !customerCode && (
                <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-md max-h-40 overflow-y-auto divide-y">
                  {Array.from(
                    new Map(
                      sheetRows
                        .filter((r) => r.customerCode === searchCustCode.trim())
                        .map((r) => [r.customerCode, r])
                    ).values()
                  ).map((row) => (
                    <li
                      key={row.customerCode}
                      onClick={() => selectSheetCustomer(row)}
                      className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      {row.customerCode} | {row.customerName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                고객명 (유사 검색) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="고객명(병원명)을 입력하세요"
                value={searchCustName}
                onChange={(e) => {
                  setSearchCustName(e.target.value);
                  setCustomerName('');
                }}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {searchCustName && !customerName && (
                <ul className="mt-1 border border-slate-200 rounded-lg bg-white shadow-md max-h-40 overflow-y-auto divide-y">
                  {Array.from(
                    new Map(
                      sheetRows
                        .filter((r) =>
                          r.customerName.toLowerCase().includes(searchCustName.toLowerCase())
                        )
                        .map((r) => [r.customerCode + r.customerName, r])
                    ).values()
                  ).map((row, idx) => (
                    <li
                      key={idx}
                      onClick={() => selectSheetCustomer(row)}
                      className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      {row.customerCode} | {row.customerName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                제품번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productCode}
                readOnly={!(product === 'nDP' && subProductName.trim().length > 0)}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder={
                  product === 'nDP' && subProductName.trim().length > 0
                    ? '세부 제품명에 해당하는 제품번호를 수기 입력하세요'
                    : ''
                }
                className={`w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm ${
                  !(product === 'nDP' && subProductName.trim().length > 0)
                    ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                    : 'bg-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                월금액 (선택 입력)
              </label>
              <input
                type="text"
                placeholder="금액을 입력하세요"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {billingType === '데모' && (
                <p className="text-xs text-blue-600 mt-1">
                  * 데모 선택 시 월금액은 0으로 자동 입력됩니다.
                </p>
              )}
            </div>

            {product && PRODUCT_RULES[product].requiresSize && PRODUCT_SIZE_OPTIONS[product] && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Size <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_SIZE_OPTIONS[product].map((opt) => {
                    const selected = !isCustomSize && size === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setIsCustomSize(false);
                          setSize(opt);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCustomSize) setSize("");
                      setIsCustomSize(true);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                      isCustomSize
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    직접 입력
                  </button>
                </div>
                {isCustomSize && (
                  <input
                    type="text"
                    placeholder="Size를 직접 입력하세요"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                )}
              </div>
            )}

            {product === 'nDP' && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  영문 고객명 (특수문자 입력 불가) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: Asan Medical Center"
                  value={englishCustomerName}
                  onChange={(e) => handleEnglishNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            )}
          </div>
        )}

        {hasMondayInfo && (
          <>
            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Comment (추가 요청사항 - 선택)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="긴급 요청, 특이사항 등 담당자에게 전달할 내용이 있다면 입력해주세요."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleProceedToSummary}
              className="w-full mt-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition cursor-pointer"
            >
              저장 및 최종 확인
            </button>
          </>
        )}

        <FooterContact />
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-3">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-slate-900 font-semibold text-right">{value}</span>
    </div>
  );
}

function FooterContact() {
  return (
    <div className="mt-8 pt-5 border-t border-slate-200 text-center">
      <a
        href={ADMIN_CHAT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 font-medium"
      >
        <MessageCircle className="w-4 h-4" />
        관리자에게 문의하기 (Google Chat)
      </a>
    </div>
  );
}