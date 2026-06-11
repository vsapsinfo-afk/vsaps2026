try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (error) {
  console.error('[SW] OneSignal SDK import failed:', error);
}
