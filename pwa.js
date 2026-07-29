// ============================================================
//  pwa.js — installation hors ligne + verrouillage paysage
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
  });
}

// Installation « vraie app » : on capte l'invite native du navigateur
let inviteInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  inviteInstall = e;
  document.dispatchEvent(new CustomEvent('pwa-installable'));
});
window.addEventListener('appinstalled', () => { inviteInstall = null; });
// Appelé par le bouton « Installer » : ouvre la boîte d'installation du système
window.installerApp = async () => {
  if (!inviteInstall) return 'indispo';
  inviteInstall.prompt();
  const { outcome } = await inviteInstall.userChoice;
  inviteInstall = null;
  return outcome;
};
window.dejaInstallee = () => window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

// Tente de verrouiller l'écran en paysage (fonctionne surtout en PWA installée / plein écran)
function verrouillerPaysage() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => { /* non supporté en onglet */ });
    }
  } catch (e) { /* non supporté */ }
}
window.addEventListener('pointerdown', verrouillerPaysage, { once: true });
window.addEventListener('keydown', verrouillerPaysage, { once: true });
