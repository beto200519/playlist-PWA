const lista  = document.querySelector('#lista');
const banner = document.querySelector('#status-banner');

// ⚠️ CAMBIA ESTA URL POR LA DE TU API EN RENDER
const API_URL = 'https://tu-api-playlist.onrender.com/api/canciones';

window.addEventListener('load', () => {
  registerSW();
  cargarCanciones();
});

/* ---------- ONLINE / OFFLINE ---------- */
function actualizarEstado() {
  if (navigator.onLine) {
    banner.textContent = '✅ En línea';
    banner.classList.remove('offline', 'oculto');
    banner.classList.add('online');
    setTimeout(() => banner.classList.add('oculto'), 2000);
  } else {
    banner.textContent = '⚠️ Sin conexión — mostrando playlist en caché';
    banner.classList.remove('online', 'oculto');
    banner.classList.add('offline');
  }
}
window.addEventListener('online',  actualizarEstado);
window.addEventListener('offline', actualizarEstado);
actualizarEstado();

/* ---------- CONSUMO DE LA API ---------- */
async function cargarCanciones() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    render(data);
  } catch (err) {
    banner.textContent = '⚠️ Sin conexión — mostrando playlist en caché';
    banner.classList.add('offline');
    try {
      const cache = await caches.open('playlist-dynamic');
      const cached = await cache.match(API_URL);
      if (cached) render(await cached.json());
    } catch (_) {}
  }
}

function render(canciones) {
  if (!canciones.length) {
    lista.innerHTML = '<p style="text-align:center">Sin canciones 🎧</p>';
    return;
  }
  lista.innerHTML = canciones.map(c => `
    <div class="card">
      <img src="${c.portada}" alt="${c.titulo}" loading="lazy"
           onerror="this.src='icono-192.png'">
      <div class="info">
        <h2>${c.titulo}</h2>
        <p class="artista">${c.artista}</p>
        <p class="album">💿 ${c.album} · ${c.anio}</p>
        <div class="meta">
          <span class="tag">${c.genero}</span>
          <span class="duracion">⏱ ${c.duracion}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ---------- SERVICE WORKER ---------- */
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('SW registrado ✅');
    } catch (e) {
      console.log('SW falló ❌', e);
    }
  }
}