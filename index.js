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
    // CONSULTA FACT CHECK DE GOOGLE
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

    const prompt = `Eres un verificador de hechos. Busca información sobre el texto, analízalo y devuélvelo estructurado como un JSON **sin ningún bloque de código**, solo el objeto plano. No incluyas etiquetas como \`\`\`json ni explicaciones externas. Recuerda que como verificador de hechos tienes que omitir la forma de expresión del texto a analizar y centrarte solo en las palabras claves que hagan referencias a sitios, fechas, hechos y personas para determinar la veracidad del contenido.

También tienes acceso a una verificación previa:

Resumen de verificación automática:
${factCheckSummary}

Devuelve solo este formato (JSON válido, sin comillas extra ni bloques de código):

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | SATIRA | OPINIÓN]",
  "confidence": 0-100,
  "explanation": "Motivo detallado y centrado en hechos.",
  "indicators": [
    "Datos contrastados o no encontrados",
    "Hechos conocidos o contradicciones",
    "Elementos de opinión o sátira",
    "Fuentes indirectas o evidencias contextuales"
  ]
}

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
