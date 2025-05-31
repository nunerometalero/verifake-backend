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
    const prompt = Eres un analista experto en verificación de información. Tu tarea es analizar un texto (como si fuera un post en redes sociales o una noticia online) y determinar su veracidad basándote exclusivamente en el contenido y su coherencia factual. No debes considerar si proviene de medios "fiables" o no, ni usar listas blancas de fuentes. Realiza una verificación independiente, utilizando conocimiento actualizado y datos objetivos. Si el texto no se puede verificar, indica claramente que no es verificable. Si detectas que el texto es sátira o una opinión, indícalo también. Si el texto incluye hechos o descripciones reales pero con un estilo subjetivo, no lo clasifiques automáticamente como "opinión". Evalúa si el contenido se basa en eventos verificables antes de decidir.

Responde en formato JSON con los siguientes campos:
- classification: "Real", "Falsa", "Sátira" o "Indeterminada"
- confidence: Porcentaje estimado de seguridad
- explanation: Explicación clara del porqué de la clasificación. Si se trata de una afirmación sensacionalista basada en hechos reales (como viajes o eventos), pero que ha sido manipulada o malinterpretada, indícalo explícitamente.
- indicators: Lista de señales detectadas como "Manipulación de imágenes", "Malinterpretación de eventos reales", "Ausencia de pruebas", "Exageración emocional", etc.

Ten en cuenta si el texto se apoya en hechos verificables o si distorsiona información real para generar escándalo.

Texto a analizar:
${texto};

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
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
