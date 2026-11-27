'use client';

import {fetchJsonp} from '@/lib/jsonp';
import { useState } from 'react';
import Link from 'next/link';
import { REQUEST_TYPES, ADMIN_CHAT_URL, ALLOWED_EMAIL_DOMAINS } from '@/lib/constants';
import {
  FileText,
  MessageCircle,
  AlertCircle,
  ArrowRight,
  Lightbulb,
  X,
  Send,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const [devModalTitle, setDevModalTitle] = useState<string | null>(null);

  // 피드백 제안 모달 상태
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleOpenFeedback = () => {
    setIsFeedbackOpen(true);
    setFeedbackSubmitted(false);
    setFeedbackError('');
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');

    if (!feedbackContent.trim()) {
      setFeedbackError('제안하실 내용을 입력해주세요.');
      return;
    }

    const trimmedEmail = feedbackEmail.trim().toLowerCase();
    if (trimmedEmail) {
      const isValidDomain = ALLOWED_EMAIL_DOMAINS.some((d) => trimmedEmail.endsWith(d));
      if (!isValidDomain) {
        setFeedbackError('답변을 받으실 경우 로슈 메일 주소(@roche.com 등)를 입력해주세요.');
        return;
      }
    }

    const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    const appsScriptToken = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
    if (!appsScriptUrl) {
      setFeedbackError('서버 URL이 설정되지 않았습니다.');
      return;
    }

    setIsSendingFeedback(true);
    try {
      const encodedData = encodeURIComponent(
        JSON.stringify({
          content: feedbackContent.trim(),
          email: trimmedEmail,
        })
      );
      const res = await fetchJsonp<{ success?: boolean; error?: string }>(
        `${appsScriptUrl}?type=feedback&token=${appsScriptToken}&data=${encodedData}`
      );
      if (!res.success) {
        setFeedbackError(res.error || '피드백 전송 중 오류가 발생했습니다.');
        return;
      }
      setFeedbackSubmitted(true);
      setFeedbackContent('');
      setFeedbackEmail('');
    } catch {
      setFeedbackError('전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4">
      <div className="max-w-2xl mx-auto w-full">
        {/* 우측 상단 피드백 제안 버튼 */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={handleOpenFeedback}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Lightbulb className="w-4 h-4 text-amber-600" />
            💡 포털 개선 아이디어 및 신규 기능 제안하기
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-3">
            Roche Diagnostics Korea
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            라이센스 통합 신청 및 관리 포털
          </h1>
          <p className="text-slate-600 mt-2 text-sm">
            원하시는 신청 유형을 선택해주세요. 안내에 따라 필수 정보만 입력하시면 담당자에게 자동 전달됩니다.
          </p>
        </div>

        <div className="space-y-3">
          {REQUEST_TYPES.map((item) =>
            item.active ? (
              <Link
                key={item.id}
                href={item.href!}
                className="flex items-center justify-between w-full bg-white hover:bg-blue-50 border-2 border-blue-600 rounded-xl p-5 shadow-sm transition group"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-semibold text-slate-900 group-hover:text-blue-700">
                      {item.title}
                    </span>
                    {'supportedProducts' in item && item.supportedProducts && (
                      <span className="block text-xs text-slate-500 mt-1">
                        지원 제품: {item.supportedProducts}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => setDevModalTitle(item.title)}
                className="flex items-center justify-between w-full bg-white hover:bg-slate-100 border border-slate-200 rounded-xl p-5 text-left transition"
              >
                <span className="font-medium text-slate-700">{item.title}</span>
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md">
                  준비중
                </span>
              </button>
            )
          )}
        </div>

        {devModalTitle && (
          <div className="mt-6 bg-amber-50 border border-amber-300 rounded-xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 text-sm">{devModalTitle}</p>
              <p className="text-amber-800 text-sm mt-1">
                현재 개발 중입니다. 라이센스 관리자에게 문의해주세요.
              </p>
              <a
                href={ADMIN_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition"
              >
                <MessageCircle className="w-4 h-4" />
                라이센스 관리자 구글 챗으로 바로 문의하기
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 피드백 및 신규 기능 제안 모달 */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 relative">
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">
                포털 개선 아이디어 및 신규 기능 제안
              </h2>
            </div>
            <p className="text-xs text-slate-600 mb-5">
              현재 폼에 없는 변경 항목 추가 요청, 불편한 점, 새로운 기능 아이디어를 자유롭게 적어주세요. 담당자 이메일과 시트(Feedbacks)에 바로 기록됩니다.
            </p>

            {feedbackSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="font-bold text-slate-900">소중한 의견이 전달되었습니다!</p>
                <p className="text-xs text-slate-600">
                  보내주신 피드백은 포털 개선에 적극 반영하겠습니다.
                </p>
                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(false)}
                  className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
                >
                  닫기
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    제안 및 피드백 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="예: 2번 변경 폼에 '계약 기간 연장' 항목도 선택할 수 있게 추가해 주세요 / 검색창에서 대리점 코드로도 바로 조회되면 좋겠습니다 등"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    답변받을 이메일 주소 <span className="text-slate-400 font-normal">(선택사항)</span>
                  </label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="회신이 필요한 경우에만 입력 (예: name@roche.com)"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {feedbackError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{feedbackError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingFeedback}
                    className="flex-2 py-2.5 px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <Send className="w-4 h-4" />
                    {isSendingFeedback ? '전송 중...' : '피드백 보내기'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="max-w-2xl mx-auto w-full mt-12 pt-6 border-t border-slate-200 text-center">
        <a
          href={ADMIN_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-medium transition"
        >
          <MessageCircle className="w-4 h-4" />
          관리자에게 문의하기 (Google Chat)
        </a>
      </footer>
    </main>
  );
}