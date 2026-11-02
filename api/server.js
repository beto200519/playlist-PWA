const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Leer data.json
const dataPath = path.join(__dirname, 'data.json');
const getCanciones = () => JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Raíz informativa
app.get('/', (req, res) => {
  res.json({
    api: 'Playlist API',
    version: '1.0',
    endpoints: {
      canciones: '/api/canciones',
      cancionPorId: '/api/canciones/:id'
    }
  });
});

// GET todas
app.get('/api/canciones', (req, res) => {
  try {
    res.json(getCanciones());
  } catch (err) {
    res.status(500).json({ error: 'Error al leer los datos' });
  }
});

// GET por id
app.get('/api/canciones/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cancion = getCanciones().find(c => c.id === id);
    if (!cancion) return res.status(404).json({ error: 'Canción no encontrada' });
    res.json(cancion);
  } catch (err) {
    res.status(500).json({ error: 'Error al leer los datos' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});