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
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ error: "Texto no proporcionado" });
  }

  try {
    const prompt = `
Eres un verificador de hechos. Tu tarea es analizar un texto como si fuera una publicación de redes sociales o una noticia online.

📌 Importante:
- No clasifiques todo como "Opinión" solo por el tono emocional.
- Tu objetivo es detectar hechos **concretos** dentro del texto, incluso si están escritos con lenguaje subjetivo o sarcástico.
- Evalúa si las afirmaciones son comprobables y dales una clasificación objetiva.
- Si hay hechos verdaderos entremezclados con opiniones, clasifica como "REAL" y explícalo.

Responde únicamente con un JSON válido, sin envolverlo en bloques de código, sin explicaciones, sin comentarios. Solo el JSON plano.

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | OPINIÓN | SATIRA]",
  "confidence": 0-100,
  "explanation": "Explicación objetiva y breve del análisis.",
  "indicators": [
    "Presencia de hechos verificables",
    "Falta de pruebas o fuentes explícitas",
    "Lenguaje emocional o subjetivo",
    "Hechos conocidos respaldados por fuentes",
    "Afirma hechos reales pero mezclados con opinión"
  ]
}

Ejemplo:
Texto: "Estos políticos votaron en contra de limitar la compra de viviendas por extranjeros en Baleares"
→ classification: "REAL"
→ confidence: 85
→ explanation: "Es un hecho comprobable y respaldado por votaciones parlamentarias recientes. Aunque el texto tiene un tono crítico, la información central es verificable."
→ indicators: ["Presencia de hechos verificables", "Hechos conocidos respaldados por fuentes"]

Texto a analizar:
"""${texto}"""
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

    const content = response.data.choices[0].message.content;
    let resultado;

    try {
      resultado = JSON.parse(content);
    } catch (e) {
      resultado = {
        classification: "Indeterminada",
        confidence: 50,
        explanation: content,
        indicators: ["Respuesta no estructurada"]
      };
    }

    res.json(resultado);
  } catch (error) {
    console.error("Error al consultar OpenAI:", error.response?.data || error.message);
    res.status(500).json({ error: "Error al analizar el texto" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor VERIFAKE escuchando en puerto ${PORT}`);
});
