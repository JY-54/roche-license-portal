import { fetchJsonp } from './jsonp';

export interface MondayItemParsed {
  id: string;
  customerNameKo: string;
  distributorName: string;
  distributorCode: string;
  customerCode: string;
  productCode: string;
  productName?: string;
  subscriptionFee: string;
  size: string;
  customerNameEn: string;
}

export async function fetchMondayItems(): Promise<MondayItemParsed[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  const token = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
  if (!baseUrl) return [];

  const data = await fetchJsonp<{ items?: MondayItemParsed[] }>(`${baseUrl}?type=monday&token=${token}`);
  return data.items || [];
}

export const fetchPendingMondayItems = fetchMondayItems;
