const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/analyze", async (req, res) => {
  const { text, url } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Texto no proporcionado" });
  }

  if (!process.env.GOOGLE_FACT_CHECK_API_KEY || !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Faltan claves de API en .env" });
  }

  try {
    const factCheckRes = await axios.get(
      "https://factchecktools.googleapis.com/v1alpha1/claims:search",
      {
        params: {
          query: text,
          key: process.env.GOOGLE_FACT_CHECK_API_KEY,
          languageCode: "es"
        }
      }
    );

    const claims = factCheckRes.data.claims || [];
    const factCheckSummary = claims.length > 0
      ? claims.map(claim => {
          const review = claim.claimReview?.[0];
          return review
            ? `${claim.text} → ${review.textualRating} por ${review.publisher?.name || "desconocido"}`
            : `${claim.text} → Sin calificación`;
        }).join("\n")
      : "No se encontraron verificaciones relevantes.";

    const prompt = `Eres un verificador profesional. Tu trabajo es analizar objetivamente un texto y determinar su veracidad.

Ya se ha hecho una búsqueda en fuentes externas (Google Fact Check API) y se te proporciona un resumen con los resultados encontrados. Basándote en ese resumen y en el contenido del texto, determina si el texto es real, falso, sátira, opinión o no verificable. No inventes fuentes. No te desvíes.

Devuelve ÚNICAMENTE un JSON limpio y válido, sin comentarios, sin bloques de código, sin adornos.

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | SATIRA | OPINIÓN]",
  "confidence": número entre 0 y 100,
  "explanation": "Explicación clara, objetiva y centrada en hechos verificables.",
  "indicators": [
    "Datos contrastados o no encontrados",
    "Hechos conocidos o contradicciones",
    "Elementos de opinión o sátira",
    "Fuentes indirectas o evidencias contextuales"
  ]
}

Resumen externo:
${factCheckSummary}

Texto a analizar:
${text}

`.trim();

    const aiRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const rawOutput = aiRes.data.choices?.[0]?.message?.content;
    if (!rawOutput) {
      return res.status(500).json({ error: "Respuesta vacía de OpenAI" });
    }

    let result;
    try {
      result = JSON.parse(rawOutput);
    } catch (err) {
      result = {
        classification: "NO VERIFICABLE",
        confidence: 50,
        explanation: rawOutput,
        indicators: ["Formato de respuesta inesperado"]
      };
    }

    const { classification, confidence, explanation, indicators } = result;
    if (!classification || confidence === undefined || !explanation || !indicators) {
      return res.status(500).json({ error: "Respuesta incompleta del análisis" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error en el análisis o en la API externa" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor VERIFAKE activo en puerto ${PORT}`);
});
