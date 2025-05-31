const { analizarTexto } = require('./openai');
const { verificarConGoogleFactCheck } = require('./googleFactCheck');
const { buscarEnSerpAPI } = require('./serpapi');
const { buscarEnNewsAPI } = require('./newsapi');

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
      newsapi: news,
    });
  }

  // Generar resumen final usando OpenAI
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

// Esta función usa OpenAI para dar el veredicto final
async function generarResumenFinal(texto, resultados) {
  const { openai } = require('./openaiConfig'); // Asegúrate de tener esto bien configurado

  const prompt = `
Eres un verificador de hechos. Se te ha proporcionado un texto y los resultados de varias fuentes (Google Fact Check, SerpAPI, NewsAPI) sobre algunas afirmaciones.

Texto original:
"${texto}"

Resultados de verificación:
${JSON.stringify(resultados, null, 2)}

Devuelve un resumen en formato JSON con los siguientes campos:
{
  "classification": "Real" | "Falso" | "Sátira" | "Opinión" | "No verificable",
  "confidence": porcentaje estimado de fiabilidad (de 0 a 100),
  "explanation": breve explicación del resultado (en español),
  "indicators": lista de señales clave que apoyan la clasificación
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const raw = response.choices[0].message.content;
console.log("[DEBUG] Respuesta RAW de OpenAI:", raw);

// Elimina posibles markdown o bloques ```json
const clean = raw.replace(/```json|```/g, '').trim();

const parsed = JSON.parse(clean);
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
