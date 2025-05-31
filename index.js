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
Eres un verificador de hechos especializado en analizar textos de redes sociales, blogs y medios online. 
Tu tarea es detectar si el texto contiene afirmaciones verificables (hechos) y clasificarlas como REALES, FALSAS, NO VERIFICABLES, SATIRA o OPINIÓN.

Tu análisis debe centrarse exclusivamente en el contenido factual. 
Ignora el estilo, tono, sarcasmo, lenguaje emocional o intenciones del autor. 
Evalúa solo las afirmaciones concretas que puedan comprobarse con datos.

Incluso si el texto está mal redactado o tiene opiniones mezcladas, si contiene un hecho verificable, debes identificarlo y evaluarlo objetivamente.

Devuelve el resultado en el siguiente formato JSON, sin ningún texto adicional:

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | OPINIÓN | SATIRA]",
  "confidence": [0-100],
  "explanation": "Explicación objetiva y clara de por qué el texto recibió esa clasificación.",
  "indicators": [
    "Presencia de hechos verificables",
    "Falta de pruebas o fuentes explícitas",
    "Lenguaje emocional o subjetivo",
    "Hechos conocidos respaldados por fuentes",
    "Afirma hechos reales pero mezclados con opinión"
  ]
}

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

    const content = response.data.choices[0].message.content.trim();
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
