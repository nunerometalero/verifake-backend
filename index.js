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
    const prompt = `Analiza y busca información sobre el siguiente texto y determina si se trata de una noticia real, falsa, sátira o indeterminada. Evalúa únicamente el contenido textual, sin considerar la fuente o el dominio web.

Responde en formato JSON con los siguientes campos:
- classification: "Real", "Falsa", "Sátira" o "Indeterminada"
- confidence: Porcentaje estimado de seguridad
- explanation: Explicación clara del porqué de la clasificación. Si se trata de una afirmación sensacionalista basada en hechos reales (como viajes o eventos), pero que ha sido manipulada o malinterpretada, indícalo explícitamente.
- indicators: Lista de señales detectadas como "Manipulación de imágenes", "Malinterpretación de eventos reales", "Ausencia de pruebas", "Exageración emocional", etc.

Ten en cuenta si el texto se apoya en hechos verificables o si distorsiona información real para generar escándalo.

Texto a analizar:
${texto}`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
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
  console.log(`Servidor VERIFAKE escuchando en puerto ${PORT}`);
});
