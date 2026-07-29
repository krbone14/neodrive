// ============================================================
//  pwa.js — installation hors ligne + verrouillage paysage
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
  });
}

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
