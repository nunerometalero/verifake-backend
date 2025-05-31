const express = require('express');
const cors = require('cors');
const { verificarTexto } = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/analyze', async (req, res) => {
  const { text, url } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Texto no proporcionado' });
  }

  try {
    const result = await verificarTexto(text);
    res.json(result);
  } catch (err) {
    console.error('[VERIFAKE] Error interno:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`[VERIFAKE] Servidor escuchando en el puerto ${PORT}`);
});
