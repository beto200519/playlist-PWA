const $ = sel => document.querySelector(sel);

const API_URL = 'https://playlist-pwa.onrender.com/api/canciones';
const LS_KEY  = 'playlist_guardada';
const CACHE_DYNAMIC = 'playlist-dynamic-v4';

let todasLasCanciones = [];
let generoActivo = 'Todos';
let busqueda = '';
let cancionActual = null;
let playInterval = null;
let playSegundos = 0;
let reproduciendo = false;

/* ================= INICIO ================= */
window.addEventListener('load', () => {
  registerSW();
  cargarCanciones();
  actualizarEstado();
  pintarPlaylistContador();
});

/* ================= ONLINE/OFFLINE ================= */
function actualizarEstado() {
  const banner = $('#status-banner');
  if (navigator.onLine) {
    banner.textContent = '✅ En línea';
    banner.classList.remove('offline', 'oculto');
    banner.classList.add('online');
    setTimeout(() => banner.classList.add('oculto'), 2000);
  } else {
    banner.textContent = '⚠️ Sin conexión — mostrando datos en caché';
    banner.classList.remove('online', 'oculto');
    banner.classList.add('offline');
  }
}
window.addEventListener('online', actualizarEstado);
window.addEventListener('offline', actualizarEstado);

/* ================= API ================= */
async function cargarCanciones() {
  try {
    const res = await fetch(API_URL);
    todasLasCanciones = await res.json();
    renderTodo();
  } catch (err) {
    console.warn('Fetch falló, intentando caché…', err);

    // Intentar leer del caché dinámico (v4)
    try {
      const cache = await caches.open(CACHE_DYNAMIC);
      const cached = await cache.match(API_URL);
      if (cached) {
        todasLasCanciones = await cached.json();
        renderTodo();
        return;
      }
    } catch (_) { /* silencio */ }

    // Si no hay caché, mostrar mensaje
    $('#lista').innerHTML = '<p class="vacio">Sin conexión y sin datos en caché 🎧</p>';
  }
}

/* ================= RENDER ================= */
function renderTodo() {
  renderGeneros();
  renderArtistas();
  renderCanciones();
}

function renderGeneros() {
  const generos = ['Todos', ...new Set(todasLasCanciones.map(c => c.genero))];
  $('#chipsGeneros').innerHTML = generos.map(g =>
    `<button class="chip ${g === generoActivo ? 'activo' : ''}" data-genero="${g}">${g}</button>`
  ).join('');

  document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      generoActivo = btn.dataset.genero;
      renderGeneros();
      renderCanciones();
      $('#tituloRecomendadas').textContent =
        generoActivo === 'Todos' ? '🔥 Recomendadas' : `🎧 ${generoActivo}`;
    });
  });
}

function renderArtistas() {
  const artistas = [...new Set(todasLasCanciones.map(c => c.artista))].slice(0, 8);
  $('#artistas').innerHTML = artistas.map(a => {
    const inicial = a.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const color = todasLasCanciones.find(c => c.artista === a).color;
    return `<button class="artista" data-artista="${a}">
      <div class="artista-avatar" style="background:${color}">${inicial}</div>
      <span>${a}</span>
    </button>`;
  }).join('');

  document.querySelectorAll('.artista').forEach(btn => {
    btn.addEventListener('click', () => {
      generoActivo = 'Todos';
      busqueda = btn.dataset.artista;
      $('#buscador').value = busqueda;
      renderCanciones();
      $('#tituloRecomendadas').textContent = `🎤 ${busqueda}`;
      document.querySelector('.section:last-of-type').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function renderCanciones() {
  let canciones = todasLasCanciones;
  if (generoActivo !== 'Todos') {
    canciones = canciones.filter(c => c.genero === generoActivo);
  }
  if (busqueda.trim()) {
    const q = busqueda.toLowerCase().trim();
    canciones = canciones.filter(c =>
      c.titulo.toLowerCase().includes(q) ||
      c.artista.toLowerCase().includes(q) ||
      c.album.toLowerCase().includes(q)
    );
  }

  if (!canciones.length) {
    $('#lista').innerHTML = '<p class="vacio">Sin resultados 🎧</p>';
    return;
  }

  $('#lista').innerHTML = canciones.map(c => `
    <div class="card" data-id="${c.id}">
      <div class="portada" style="background:${c.color};color:${esColorClaro(c.color) ? '#121212' : '#fff'}">
        <span>${c.iniciales}</span>
      </div>
      <div class="info">
        <h3>${c.titulo}</h3>
        <p class="artista-txt">${c.artista}</p>
        <p class="album">💿 ${c.album} · ${c.anio}</p>
        <div class="meta">
          <span class="tag">${c.genero}</span>
          <span class="duracion">⏱ ${c.duracion}</span>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => abrirModalCancion(parseInt(card.dataset.id)));
  });
}

function esColorClaro(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

/* ================= BUSCADOR ================= */
$('#buscador').addEventListener('input', e => {
  busqueda = e.target.value;
  renderCanciones();
  if (!busqueda) $('#tituloRecomendadas').textContent = '🔥 Recomendadas';
});

/* ================= MODAL CANCIÓN ================= */
function abrirModalCancion(id) {
  cancionActual = todasLasCanciones.find(c => c.id === id);
  if (!cancionActual) return;

  const c = cancionActual;
  $('#songPortada').style.background = c.color;
  $('#songPortada').style.color = esColorClaro(c.color) ? '#121212' : '#fff';
  $('#songIniciales').textContent = c.iniciales;
  $('#songTitulo').textContent = c.titulo;
  $('#songArtista').textContent = c.artista;
  $('#songAlbum').textContent = `💿 ${c.album} · ${c.anio} · ${c.genero}`;

  resetPlayer();
  $('#btnAgregar').textContent = enPlaylist(c.id) ? '✅ Ya en tu playlist' : '➕ Agregar a mi playlist';
  $('#btnAgregar').disabled = enPlaylist(c.id);

  $('#modalCancion').hidden = false;
  document.body.style.overflow = 'hidden';
}

function resetPlayer() {
  clearInterval(playInterval);
  reproduciendo = false;
  playSegundos = 0;
  $('#btnPlay').textContent = '▶';
  $('#progressBar').style.width = '0%';
  $('#time').textContent = '0:00';
}

function togglePlay() {
  if (!cancionActual) return;
  const [min, sec] = cancionActual.duracion.split(':').map(Number);
  const total = min * 60 + sec;

  if (reproduciendo) {
    clearInterval(playInterval);
    reproduciendo = false;
    $('#btnPlay').textContent = '▶';
  } else {
    reproduciendo = true;
    $('#btnPlay').textContent = '⏸';
    playInterval = setInterval(() => {
      playSegundos++;
      if (playSegundos >= total) { resetPlayer(); return; }
      const pct = (playSegundos / total) * 100;
      $('#progressBar').style.width = pct + '%';
      const mm = Math.floor(playSegundos / 60);
      const ss = String(playSegundos % 60).padStart(2, '0');
      $('#time').textContent = `${mm}:${ss}`;
    }, 1000);
  }
}

/* ================= PLAYLIST ================= */
function getPlaylist() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function setPlaylist(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
  pintarPlaylistContador();
  pintarPlaylistModal();
}

function enPlaylist(id) {
  return getPlaylist().some(c => c.id === id);
}

function agregarAPlaylist() {
  if (!cancionActual) return;
  const pl = getPlaylist();
  if (!enPlaylist(cancionActual.id)) {
    pl.push(cancionActual);
    setPlaylist(pl);
    $('#btnAgregar').textContent = '✅ Ya en tu playlist';
    $('#btnAgregar').disabled = true;
  }
}

function quitarDePlaylist(id) {
  setPlaylist(getPlaylist().filter(c => c.id !== id));
}

function vaciarPlaylist() {
  if (confirm('¿Vaciar tu playlist?')) setPlaylist([]);
}

function pintarPlaylistContador() {
  $('#contador').textContent = getPlaylist().length;
}

function pintarPlaylistModal() {
  const pl = getPlaylist();
  if (!pl.length) {
    $('#playlistItems').innerHTML = '<p class="vacio">Aún no has agregado canciones 🎵</p>';
    $('#btnVaciar').style.display = 'none';
    return;
  }
  $('#btnVaciar').style.display = 'block';
  $('#playlistItems').innerHTML = pl.map(c => `
    <div class="playlist-item">
      <div class="pl-mini" style="background:${c.color};color:${esColorClaro(c.color) ? '#121212' : '#fff'}">${c.iniciales}</div>
      <div class="pl-info">
        <strong>${c.titulo}</strong>
        <span>${c.artista}</span>
      </div>
      <button class="pl-quitar" data-id="${c.id}">✕</button>
    </div>
  `).join('');

  document.querySelectorAll('.pl-quitar').forEach(btn => {
    btn.addEventListener('click', () => quitarDePlaylist(parseInt(btn.dataset.id)));
  });
}

/* ================= BOTONES ================= */
$('#btnPlay').addEventListener('click', togglePlay);
$('#btnAgregar').addEventListener('click', agregarAPlaylist);
$('#btnPlaylist').addEventListener('click', () => {
  pintarPlaylistModal();
  $('#modalPlaylist').hidden = false;
  document.body.style.overflow = 'hidden';
});
$('#btnVaciar').addEventListener('click', vaciarPlaylist);

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = document.getElementById(btn.dataset.close);
    modal.hidden = true;
    document.body.style.overflow = '';
    if (btn.dataset.close === 'modalCancion') resetPlayer();
  });
});

document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) {
      ov.hidden = true;
      document.body.style.overflow = '';
      if (ov.id === 'modalCancion') resetPlayer();
    }
  });
});

/* ================= SW ================= */
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