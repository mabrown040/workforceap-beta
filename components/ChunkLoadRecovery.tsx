'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'wap:chunk-reload-once';

function shouldRecover(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes('chunkloaderror') ||
    text.includes('loading chunk') ||
    text.includes('failed to fetch dynamically imported module')
  );
}

function reloadOnce() {
  if (typeof window === 'undefined') return;
  try {
    if (window.sessionStorage.getItem(RELOAD_KEY) === '1') return;
    window.sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {}
  window.location.reload();
}

export default function ChunkLoadRecovery() {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(RELOAD_KEY);
    } catch {}

    const onError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || '';
      if (shouldRecover(message)) reloadOnce();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message || reason?.name || '';
      if (shouldRecover(message)) {
        event.preventDefault();
        reloadOnce();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
