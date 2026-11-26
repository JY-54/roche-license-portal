import { NextResponse } from 'next/server';
import { fetchCustomerSheetData } from '@/lib/google-sheets';

export async function GET() {
  try {
    const rows = await fetchCustomerSheetData();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ error: '구글 스프레드시트 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
}