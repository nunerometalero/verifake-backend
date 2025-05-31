const { analizarTexto } = require('../utils/openai');
const { verificarConGoogleFactCheck } = require('../utils/googleFactCheck');
const { buscarEnSerpAPI } = require('../utils/serpapi');
const { buscarEnNewsAPI } = require('../utils/newsapi');

async function verificarTexto(texto) {
  console.log('[✔] Analizando texto con OpenAI...');
  const analisis = await analizarTexto(texto);

  const afirmaciones = analisis.match(/- Afirmación: "(.*?)"/g)?.map(x =>
    x.replace('- Afirmación: "', '').replace('"', '')
  ) || [];

  const resultados = [];

  for (const afirmacion of afirmaciones) {
    console.log(`[🧠] Verificando: ${afirmacion}`);
    const google = await verificarConGoogleFactCheck(afirmacion);
    const serp = await buscarEnSerpAPI(afirmacion);
    const news = await buscarEnNewsAPI(afirmacion);

    resultados.push({ afirmacion, google, serp, news });
  }

  // ⚙️ Ahora analizamos los resultados y damos una clasificación
  let classification = 'Desconocido';
  let confidence = 0;
  let explanation = 'No se encontró suficiente información para una verificación clara.';
  let indicators = [];

  if (resultados.length > 0) {
    const match = JSON.stringify(resultados).toLowerCase();

    if (match.includes('falso') || match.includes('desmentido') || match.includes('bulo')) {
      classification = 'Falso';
      confidence = 85;
      explanation = 'Las fuentes consultadas desmienten al menos una de las afirmaciones clave.';
      indicators.push('Desmentido por medios de verificación');
    } else if (match.includes('verdadero') || match.includes('confirmado')) {
      classification = 'Real';
      confidence = 90;
      explanation = 'Se encontró confirmación en múltiples fuentes.';
      indicators.push('Confirmado por fuentes verificadas');
    } else {
      classification = 'No verificable';
      confidence = 50;
      explanation = 'No hay evidencia clara a favor o en contra.';
      indicators.push('Falta de consenso en fuentes');
    }
  }

  return {
    classification,
    confidence,
    explanation,
    indicators
  };
}

module.exports = { verificarTexto };
