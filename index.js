const express = require('express');
const bodyParser = require('body-parser');
const { analizarTexto } = require('./utils/openai');
const { verificarConGoogleFactCheck } = require('./utils/googleFactCheck');
const { buscarEnSerpAPI } = require('./utils/serpapi');
const { buscarEnNewsAPI } = require('./utils/newsapi');

const app = express();
app.use(bodyParser.json());

// Endpoint de verificación
app.post('/verificar', async (req, res) => {
  try {
    const texto = req.body.texto;
    const resultado = await verificarTexto(texto);
    res.json(resultado);
  } catch (err) {
    console.error('[ERROR] Verificando texto:', err.message);
    res.status(500).json({ error: 'Error en el análisis.' });
  }
});

// Escuchar en el puerto indicado por Render (o 3000 localmente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[✅] Servidor VERIFAKE iniciado en el puerto ${PORT}`);
});

// --------- Lógica existente (no modificada) ---------

async function verificarTexto(texto) {
  console.log('[✔] Analizando texto con OpenAI...');
  const analisis = await analizarTexto(texto);

  console.log('[✔] Extrayendo afirmaciones...');
  const afirmaciones = analisis.match(/- Afirmación: "(.*?)"/g)?.map(x =>
    x.replace('- Afirmación: "', '').replace('"', '')
  ) || [];

  const resultados = [];

  for (const afirmacion of afirmaciones) {
    console.log(`[🧠] Verificando: ${afirmacion}`);
    const google = await verificarConGoogleFactCheck(afirmacion);
    const serp = await buscarEnSerpAPI(afirmacion);
    const news = await buscarEnNewsAPI(afirmacion);

    resultados.push({
      afirmacion,
      google,
      serpapi: serp,
      newsapi: news
    });
  }

  console.log('[🧠] Generando resumen final...');
  const resumen = await generarResumenFinal(texto, resultados);

  return {
    classification: resumen.classification || 'Desconocido',
    confidence: resumen.confidence || null,
    explanation: resumen.explanation || 'Sin explicación disponible',
    indicators: resumen.indicators || [],
    analisis,
    resultados
  };
}

async function generarResumenFinal(texto, resultados) {
  const { openai } = require('./openaiConfig');

  const prompt = `
Ignora opiniones, tonos emocionales, sesgos o expresiones subjetivas. Extrae solo afirmaciones objetivas y comprobables, como:
- “Pedro Sánchez ha sido destituido.”
- “España ha roto relaciones con Israel.”
- “El Reino Unido apoya la expulsión de Israel de Eurovisión.”

A partir del siguiente texto y los resultados de búsqueda, clasifica la veracidad con base en evidencias fiables. Prioriza los datos confirmados por Google Fact Check (mayor peso), seguido de NewsAPI y luego SerpAPI.

Texto original:
"${texto}"

Resultados de verificación:
${JSON.stringify(resultados, null, 2)}

Devuelve un JSON con:
{
  "classification": "Real" | "Falso" | "Sátira" | "Opinión" | "No verificable",
  "confidence": número entre 0 y 100 (según fuentes encontradas),
  "explanation": explicación breve en español,
  "indicators": lista de señales clave que apoyan la clasificación
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });

    const raw = response.choices[0].message.content;
    console.log("[DEBUG] Respuesta RAW de OpenAI:", raw);

    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (jsonErr) {
      console.warn('[⚠️] Error al parsear JSON:', jsonErr.message);
      return {
        classification: 'Desconocido',
        confidence: null,
        explanation: 'OpenAI devolvió un formato inesperado.',
        indicators: []
      };
    }

    return parsed;
  } catch (err) {
    console.error('[VERIFAKE] Error generando resumen final:', err.message);
    return {
      classification: 'Desconocido',
      confidence: null,
      explanation: 'Error al generar el resumen final.',
      indicators: []
    };
  }
}

module.exports = { verificarTexto };
