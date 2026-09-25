let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  window.dispatchEvent(new Event('pwa-install-available'));
});

export function canInstallPwa() {
  return Boolean(deferredInstallPrompt);
}

export async function installPwa() {
  if (!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return result.outcome === 'accepted';
}
