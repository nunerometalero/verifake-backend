const dotenv = require('dotenv');
dotenv.config();

const fetch = require('node-fetch');
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_FACTCHECK_API_KEY = process.env.GOOGLE_FACT_CHECK_API_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

async function analizarTexto(texto) {
  const prompt = `
Actúa como un verificador de hechos. Dado el siguiente texto, identifica las afirmaciones principales que puedan ser comprobadas con hechos. Para cada afirmación, responde en el siguiente formato:

- Afirmación: "<afirmación extraída>"
- Verificable: Sí/No
- Hechos encontrados: "<resumen de hechos si se encuentran>"
- Fiabilidad (0-100): <número>
- Fuente (si se puede): <URL o "No encontrada">

Texto:
"${texto}"
  `;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No se pudo analizar.';
}

async function verificarConGoogleFactCheck(afirmacion) {
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(afirmacion)}&key=${GOOGLE_FACTCHECK_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.claims?.length) return 'No se encontraron verificaciones.';
  return data.claims.map(claim => `Fuente: ${claim.claimReview[0].publisher.name} | Veredicto: ${claim.claimReview[0].text}`);
}

async function verificarConSerpAPI(afirmacion) {
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(afirmacion)}&api_key=${SERPAPI_KEY}&hl=es&gl=es`;
  const res = await fetch(url);
  const data = await res.json();
  const top = data.organic_results?.[0]?.link || 'No encontrada';
  return `Resultado top: ${top}`;
}

async function verificarConNewsAPI(afirmacion) {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(afirmacion)}&apiKey=${NEWSAPI_KEY}&language=es&pageSize=1`;
  const res = await fetch(url);
  const data = await res.json();
  const articulo = data.articles?.[0];
  return articulo
    ? `Fuente: ${articulo.source.name} | Título: ${articulo.title} | URL: ${articulo.url}`
    : 'No se encontró en noticias.';
}

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
    const serp = await verificarConSerpAPI(afirmacion);
    const news = await verificarConNewsAPI(afirmacion);

    resultados.push({
      afirmacion,
      google,
      serp,
      news,
    });
  }

  return {
    analisis,
    resultados,
  };
}

module.exports = { verificarTexto };
