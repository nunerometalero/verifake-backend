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
    const prompt = `Analiza el siguiente texto y determina si contiene desinformación, sátira, o es una noticia real.
Responde en formato JSON con los siguientes campos:
- classification: "Real", "Falsa", "Sátira" o "Indeterminada"
- confidence: Porcentaje estimado de seguridad
- explanation: Explicación breve del análisis
- indicators: lista de pistas o factores detectados

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
