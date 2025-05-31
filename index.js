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
Eres un verificador de hechos. Tu tarea es analizar un texto como si fuera una publicación de redes sociales o una noticia en internet. Tu objetivo principal es identificar afirmaciones concretas (hechos) y verificar si son verdaderas, falsas o no verificables.

Si el texto tiene mezcla de opiniones y hechos, **no lo clasifiques todo como opinión**. Identifica si existen datos verificables y valóralos por separado. El tono emocional o sarcástico del texto no debe afectar tu evaluación de los hechos.

Devuelve el resultado con este formato:

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | OPINIÓN | SATIRA]",
  "confidence": [0-100], // nivel de seguridad del análisis
  "explanation": "Explicación objetiva de la clasificación. Si hay hechos verdaderos pero el resto es opinión, explícalo.",
  "indicators": [
    "Presencia de hechos verificables",
    "Falta de pruebas o fuentes explícitas",
    "Lenguaje emocional o subjetivo",
    "Hechos conocidos respaldados por fuentes",
    "Afirma hechos reales pero mezclados con opinión"
  ]
}

Ejemplo:
Texto: "Han votado en contra de limitar que los extranjeros compren vivienda en Baleares"
→ classification: "REAL"
→ confidence: 85
→ explanation: "La afirmación corresponde a un hecho registrado en votaciones recientes, confirmado por registros parlamentarios. A pesar del lenguaje crítico, el dato es verificable."
→ indicators: ["Presencia de hechos verificables", "Hechos conocidos respaldados por fuentes"]


No agregues comentarios, no expliques fuera del JSON.

Texto a analizar:
${texto};

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      },
      {
        headers: {
          Authorization: Bearer ${process.env.OPENAI_API_KEY},
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
        confidence: "50%",
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
  console.log(Servidor VERIFAKE escuchando en puerto ${PORT});
});
