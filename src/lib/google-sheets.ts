import { fetchJsonp } from './jsonp';

export interface SheetRowParsed {
  distributorCode: string;
  customerCode: string;
  distributorName: string;
  customerName: string;
}

export async function fetchCustomerSheetData(): Promise<SheetRowParsed[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  const token = process.env.NEXT_PUBLIC_APPS_SCRIPT_TOKEN;
  if (!baseUrl) return [];

  const data = await fetchJsonp<{ rows?: SheetRowParsed[] }>(`${baseUrl}?type=sheets&token=${token}`);
  return data.rows || [];
}
