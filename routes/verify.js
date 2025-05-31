const express = require('express');
const router = express.Router();
const { getFactCheckSummary } = require('../utils/factcheck'); // función que llama a Google Fact Check
const { openai } = require('../utils/openai'); // setup de la API de OpenAI

router.post('/', async (req, res) => {
  const { text } = req.body;

  try {
    const factCheckSummary = await getFactCheckSummary(text);

    const prompt = `
Eres un verificador profesional y tu única fuente externa permitida es el siguiente resumen generado desde Google Fact Check API. 
Tu trabajo es analizar objetivamente el texto a continuación y clasificarlo según su veracidad: 
REAL, FALSO, SATIRA, OPINIÓN o NO VERIFICABLE.

No inventes fuentes, no asumas hechos sin respaldo. Basa tu análisis exclusivamente en el contenido del texto y el resumen de verificación proporcionado.

Devuelve únicamente un JSON válido, sin bloques de código, sin comentarios, sin etiquetas ni formato extra.

{
  "classification": "[REAL | FALSO | NO VERIFICABLE | SATIRA | OPINIÓN]",
  "confidence": número entre 0 y 100,
  "explanation": "Explicación clara, objetiva y centrada en hechos verificables.",
  "indicators": [
    "Datos contrastados o no encontrados",
    "Hechos conocidos o contradicciones",
    "Elementos de opinión o sátira",
    "Fuentes indirectas o evidencias contextuales"
  ]
}

Resumen de verificación externa:
${factCheckSummary}

Texto a analizar:
${text}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const json = JSON.parse(completion.choices[0].message.content);
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar el texto.' });
  }
});

module.exports = router;
