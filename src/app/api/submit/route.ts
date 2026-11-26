import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_EMAIL_DOMAINS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email: string = (body.requester_email || '').trim().toLowerCase();

    const isValidDomain = ALLOWED_EMAIL_DOMAINS.some((domain) => email.endsWith(domain));
    if (!isValidDomain) {
      return NextResponse.json(
        { error: '로슈 메일 주소만 신청 가능합니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: '요청 검증 중 오류가 발생했습니다.' },
      { status: 400 }
    );
  }
}
