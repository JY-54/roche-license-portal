'use client';

import { useState } from 'react';
import Link from 'next/link';
import { REQUEST_TYPES, ADMIN_CHAT_URL } from '@/lib/constants';
import { FileText, MessageCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const [devModalTitle, setDevModalTitle] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4">
      <div className="max-w-2xl mx-auto w-full">
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
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-slate-900 group-hover:text-blue-700">
                    {item.title}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
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