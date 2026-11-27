'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ALLOWED_EMAIL_DOMAINS, ADMIN_CHAT_URL } from '@/lib/constants';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Paperclip,
  Trash2,
  HelpCircle,
} from 'lucide-react';

const INQUIRY_CATEGORIES = [
  '1. 신규 라이센스 신청 관련',
  '2. 라이센스 변경 (고객명/버전 등) 관련',
  '3. Cache -> IRIS 업그레이드 신청 관련',
  '4. 현재 버전 라이센스 파일 요청 관련',
  '5. 모름 (기타 문의)',
];

const MAX_TOTAL_BYTES = 8 * 1024 * 1024; // 총 8MB 제한

interface AttachedFileItem {
  name: string;
  mimeType: string;
  size: number;
  base64: string;
}

export default function DirectInquiryPage() {
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<AttachedFileItem[]>([]);
  const [replyEmail, setReplyEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const currentSize = files.reduce((acc, f) => acc + f.size, 0);
    const addedSize = selected.reduce((acc, f) => acc + f.size, 0);

    if (currentSize + addedSize > MAX_TOTAL_BYTES) {
      setErrorMsg('첨부파일 총 용량은 8MB를 초과할 수 없습니다.');
      e.target.value = '';
      return;
    }

    const readAsBase64 = (file: File): Promise<AttachedFileItem> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve({
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            base64,
          });
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(file);
      });

    try {
      const converted = await Promise.all(selected.map(readAsBase64));
      setFiles((prev) => [...prev, ...converted]);
    } catch {
      setErrorMsg('파일을 읽는 중 오류가 발생했습니다.');
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!category) {
      setErrorMsg('어떤 항목과 관련된 문의인지 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('문의 내용을 입력해주세요.');
      return;
    }

    const trimmedEmail = replyEmail.trim().toLowerCase();
    const isValidEmail = ALLOWED_EMAIL_DOMAINS.some((d) => trimmedEmail.endsWith(d));
    if (!trimmedEmail || !isValidEmail) {
      setErrorMsg('답변받으실 로슈 메일 주소(@roche.com / @contractors.roche.com / @external.roche.com)를 입력해주세요.');
      return;
    }

    const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    const appsScriptToken = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
    if (!appsScriptUrl) {
      setErrorMsg('Apps Script URL이 설정되지 않았습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: 'qna',
          token: appsScriptToken,
          category,
          content: content.trim(),
          email: trimmedEmail,
          files,
        }),
      });

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 파일 용량을 줄이거나 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">
            관리자에게 문의가 정상 접수되었습니다
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            작성하신 문의 내용과 첨부파일이 관리자 메일 및 시트(Q&amp;A)에 전달되었습니다. 확인 후{' '}
            <strong className="text-slate-900">{replyEmail}</strong> 주소로 답변드리겠습니다.
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
                setCategory('');
                setContent('');
                setFiles([]);
                setIsSubmitted(false);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition"
            >
              추가 문의하기
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
          <div className="flex items-center gap-2.5 mb-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              5. 기타: 라이센스 관리자에게 직접 문의하기
            </h1>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            1~4번 신청 양식으로 처리가 어렵거나 오류 화면(스크린샷) 전달이 필요한 경우 아래 양식으로 문의해주세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. 관련 항목 선택 */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                1. 어떤 항목과 관련된 문의인가요? <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {INQUIRY_CATEGORIES.map((item) => {
                  const selected = category === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition flex items-center justify-between ${
                        selected
                          ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item}</span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selected ? 'border-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 문의 내용 */}
            <div className="border-t border-slate-200 pt-5">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                2. 문의 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="병원명, 제품명, 현재 겪고 계신 상황이나 요청사항을 자세히 적어주세요."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 3. 파일 첨부 (선택, 최대 8MB) */}
            <div className="border-t border-slate-200 pt-5">
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                3. 스크린샷 및 참고 파일 첨부{' '}
                <span className="text-slate-400 font-normal">(선택 / 총 8MB 이내)</span>
              </label>
              <p className="text-xs text-slate-500 mb-2.5">
                오류 화면 캡처(PNG, JPG)나 라이센스 관련 문서를 첨부하시면 더 빠른 확인이 가능합니다.
              </p>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition">
                <Paperclip className="w-4 h-4 text-slate-600" />
                파일 선택하기
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.txt,.key"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <span className="truncate font-medium text-slate-800">
                        {f.name}{' '}
                        <span className="text-slate-400">
                          ({(f.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-red-600 ml-2 shrink-0 cursor-pointer"
                        title="첨부 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 4. 답변받을 이메일 주소 */}
            <div className="border-t border-slate-200 pt-5">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                4. 답변받으실 로슈 이메일 주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={replyEmail}
                onChange={(e) => setReplyEmail(e.target.value)}
                placeholder="name@roche.com"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                허용 도메인: @roche.com, @contractors.roche.com, @external.roche.com
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-sm inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? '문의 내용 및 파일 전송 중...' : '관리자에게 문의 제출하기'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href={ADMIN_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-blue-600"
          >
            긴급한 경우 관리자에게 Google Chat으로 바로 문의하기
          </a>
        </div>
      </div>
    </main>
  );
}