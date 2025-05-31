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
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Texto no proporcionado" });
  }

  if (!process.env.GOOGLE_FACT_CHECK_API_KEY || !process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Faltan claves de API en .env" });
  }

  try {
    // Búsqueda en Google Fact Check
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

    // Prompt para GPT
    const prompt = `
Eres un verificador profesional y tu única fuente externa permitida es el siguiente resumen generado desde Google Fact Check API.

Tu tarea es analizar SOLO los HECHOS EXPRESADOS EXPLÍCITAMENTE en el texto (sin interpretar intenciones, ironías ni emociones) y clasificarlos según su veracidad. No analices el tono ni los sentimientos del autor.

Paso 1. Identifica afirmaciones verificables contenidas en el texto. No incluyas opiniones, sarcasmos ni expresiones emocionales. Solo hechos verificables como:
- "El CERN ha convertido plomo en oro"
- "PP y Vox votaron en contra de las ayudas"
- "300 personas se manifestaron en Moncloa"
- "La vacuna tiene grafeno"

Paso 2. Verifica cada afirmación usando SOLO el resumen externo proporcionado. Si una afirmación contradice leyes físicas, hechos científicos o datos públicos ampliamente conocidos (como registros parlamentarios), clasifícala como FALSO incluso si la API no da resultado explícito.

Paso 3. Devuelve un JSON en este formato. No inventes información ni expliques más allá de lo pedido.

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | SATIRA | OPINIÓN]",
  "confidence": número entre 0 y 100,
  "explanation": "Explicación clara, objetiva y centrada en hechos verificables del texto.",
  "indicators": [
    "Hechos concretos encontrados o no",
    "Verificación cruzada con la API o conocimiento común",
    "Elementos de sátira, ironía o subjetividad detectados",
    "Contradicciones con evidencia pública, científica o legal"
  ]
}

Resumen externo para verificación:
${factCheckSummary}

Texto a analizar:
${text}
`;


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

    // Limpieza de respuesta si viniera entre bloques o con caracteres extraños
    const cleanOutput = rawOutput
      .replace(/```(json)?/gi, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // caracteres invisibles
      .trim();

    let result;
    try {
      result = JSON.parse(cleanOutput);
    } catch (err) {
      console.error("Error al parsear JSON:", err.message);
      return res.status(500).json({
        classification: "NO VERIFICABLE",
        confidence: 50,
        explanation: "La respuesta de la IA no tenía un formato JSON válido.",
        indicators: ["Formato de respuesta inesperado"]
      });
    }

    const { classification, confidence, explanation, indicators } = result;
    if (
      !classification ||
      confidence === undefined ||
      !explanation ||
      !Array.isArray(indicators)
    ) {
      return res.status(500).json({ error: "Respuesta incompleta del análisis" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error en el análisis o en la API externa" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor VERIFAKE activo en puerto ${PORT}`);
});
