const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const { verificarTexto } = require("./utils/verifier.js"); // ✅ Importa el verificador completo

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/analyze", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Texto no proporcionado" });
  }

  if (
    !process.env.GOOGLE_FACT_CHECK_API_KEY ||
    !process.env.OPENAI_API_KEY ||
    !process.env.SERPAPI_KEY ||
    !process.env.NEWSAPI_KEY
  ) {
    return res.status(500).json({ error: "Faltan claves de API en .env" });
  }

  try {
    // ✅ Llama al verificador centralizado
    const resultado = await verificarTexto(text);

    // ✅ Devuelve directamente el resultado enriquecido
    res.json(resultado);
  } catch (error) {
    console.error("Error en /analyze:", error.message || error);
    res.status(500).json({ error: "Error en el análisis o en la API externa" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor VERIFAKE activo en puerto ${PORT}`);
});
