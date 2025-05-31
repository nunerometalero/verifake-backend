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
Eres un analista experto en verificación de hechos. Tu tarea es analizar el siguiente texto como si fuera una publicación en redes sociales, una noticia online o una cadena viral. 

Debes determinar su veracidad basándote únicamente en el contenido del texto y su coherencia factual, sin considerar la reputación de la fuente. No uses listas blancas o negras de medios. No presupongas credibilidad por el origen.

Evalúa si el texto:
- Es verificable de forma objetiva
- Manipula información real
- Es una sátira, una opinión, o simplemente no verificable
- Contiene elementos claramente falsos o engañosos

Devuelve el resultado en **formato JSON exacto** con esta estructura:

{
  "classification": "Real" | "Falsa" | "Sátira" | "Opinión" | "Indeterminada",
  "confidence": número entre 0 y 100,  // Porcentaje estimado de certeza
  "explanation": "Explicación clara y objetiva sobre por qué el texto ha recibido esa clasificación.",
  "indicators": [
    "Datos verificados o no encontrados",
    "Distorsión de hechos reales",
    "Lenguaje emocional o sensacionalista",
    "Ausencia de pruebas",
    "Elementos subjetivos o de sátira",
    "Fuentes cruzadas (sin asumir fiabilidad por el medio)"
  ]
}

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
