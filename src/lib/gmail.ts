export async function sendAdminNotificationEmail(data: any, requestId: string, originUrl: string) {
  await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: process.env.GOOGLE_APPS_SCRIPT_TOKEN,
      payload: data,
      requestId,
      originUrl,
    }),
  });
}