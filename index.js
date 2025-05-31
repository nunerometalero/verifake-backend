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

  try {
    const factCheckRes = await axios.get(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search`,
      {
        params: {
          query: text,
          key: process.env.GOOGLE_FACT_CHECK_API_KEY,
          languageCode: "es"
        }
      }
    );

    let claims = factCheckRes.data.claims || [];
    let factCheckSummary = claims.length > 0
      ? claims.map((c) => `${c.text} (${c.claimReview?.[0]?.textualRating || "Sin calificar"})`).join("\n")
      : "No se encontraron resultados relevantes en bases de datos de verificación.";

    const prompt = `
Eres un analista experto en verificación de información. Tu tarea es analizar un texto (como si fuera un post en redes sociales o una noticia online) y determinar su veracidad basándote exclusivamente en el contenido y su coherencia factual.

No debes usar listas blancas ni confiar en medios oficiales, solo análisis objetivo y semántico. Si no se puede verificar, indícalo claramente. Si detectas sátira u opinión, también.

Información adicional obtenida automáticamente de bases de datos de verificación de hechos:
"""${factCheckSummary}"""

Devuelve el resultado como JSON:

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | SATIRA | OPINIÓN]",
  "confidence": 0-100,
  "explanation": "Explicación objetiva de la clasificación.",
  "indicators": [
    "Datos contrastados o no encontrados",
    "Hechos conocidos o contradicciones",
    "Elementos de opinión o sátira",
    "Fuentes indirectas o evidencias contextuales"
  ]
}

Texto a analizar:
"""${text}"""
    `;

    const response = await axios.post(
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

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "La respuesta de OpenAI está vacía." });
    }

    let resultado;

    try {
      resultado = JSON.parse(content);
    } catch (e) {
      resultado = {
        classification: "NO VERIFICABLE",
        confidence: 50,
        explanation: content,
        indicators: ["Formato de respuesta inesperado"]
      };
    }

    // Validar campos esperados
    const { classification, confidence, explanation, indicators } = resultado;
    if (!classification || confidence === undefined || !explanation || !indicators) {
      return res.status(500).json({ error: "La respuesta de OpenAI no contiene todos los campos esperados." });
    }

    res.json(resultado);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error al procesar el análisis" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor VERIFAKE escuchando en puerto ${PORT}`);
});
