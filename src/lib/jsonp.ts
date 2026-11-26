export function fetchJsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_cb_' + Math.random().toString(36).substring(2, 11);
    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    (window as unknown as Record<string, unknown>)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };

    document.body.appendChild(script);
  });
}
