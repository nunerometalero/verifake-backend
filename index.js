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
Eres un analista experto en verificación de información. Tu tarea es analizar un texto (como si fuera un post en redes sociales o una noticia online) y determinar su veracidad basándote exclusivamente en el contenido y su coherencia factual. No debes considerar si proviene de medios "fiables" o no, ni usar listas blancas de fuentes.

Realiza una verificación independiente, utilizando conocimiento actualizado y datos objetivos. Si el texto no se puede verificar, indica claramente que no es verificable. Si detectas que el texto es sátira o una opinión, indícalo también.

Devuelve el resultado con la siguiente estructura:

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | SATIRA | OPINIÓN]",
  "confidence": [0-100], // Porcentaje estimado de fiabilidad del análisis
  "explanation": "Explicación objetiva de por qué el texto ha recibido esa clasificación.",
  "indicators": [
    "Datos contrastados o no encontrados",
    "Referencias o hechos conocidos",
    "Elementos de opinión, sátira o lenguaje emocional",
    "Fuentes cruzadas, si las hay (sin usar medios oficiales como criterio de fiabilidad)"
  ]
}

Ejemplo:
Texto: "Un meteorito ha destruido la Torre Eiffel esta mañana."
→ classification: "FALSO"
→ confidence: 98
→ explanation: "No existen reportes verificables ni evidencias de tal evento. La Torre Eiffel sigue en pie según múltiples fuentes cruzadas."
→ indicators: ["No hay fuentes independientes", "Noticias actuales lo contradicen", "Sería un hecho global ampliamente cubierto"]

Ahora analiza el siguiente texto:
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
