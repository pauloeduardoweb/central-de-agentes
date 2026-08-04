import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure proper language and disable auto-translation in DOM
if (typeof document !== 'undefined') {
  document.documentElement.lang = 'pt-BR';
  document.documentElement.setAttribute('translate', 'no');
  if (document.body) {
    document.body.classList.add('notranslate');
    document.body.setAttribute('translate', 'no');
  }
}

const APP_BUILD_VERSION = '2026-08-03-v3-android-fix';
console.log('[APP BUILD VERSION]', APP_BUILD_VERSION);

// Purge old ServiceWorker registrations and browser caches on Android/iOS
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((unregistered) => {
        if (unregistered) {
          console.log('[SW CLEANUP] Unregistered legacy service worker');
        }
      });
    }
  });

  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
