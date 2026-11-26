import { NextResponse } from 'next/server';
import { fetchPendingMondayItems } from '@/lib/monday';

export async function GET() {
  try {
    const items = await fetchPendingMondayItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Monday API Error:', error);
    return NextResponse.json({ error: '먼데이닷컴 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
}