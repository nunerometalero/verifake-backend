import dotenv from 'dotenv';
dotenv.config();

import { buscarEnSerpAPI } from './utils/serpapi.js';
import { buscarEnNewsAPI } from './utils/newsapi.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_FACTCHECK_API_KEY = process.env.GOOGLE_FACTCHECK_API_KEY;

async function analizarTexto(texto) {
  const prompt = `
  Actúa como un verificador de hechos. Dado el siguiente texto, identifica las afirmaciones principales que puedan ser comprobadas con hechos. Para cada afirmación, responde en el siguiente formato:

  - Afirmación: "<afirmación extraída>"
  - Verificable: Sí/No
  - Hechos encontrados: "<resumen de hechos si se encuentran>"
  - Fiabilidad (0-100): <número>
  - Fuente (si se puede): <URL o \"No encontrada\">

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
  const respuesta = data.choices?.[0]?.message?.content || 'No se pudo analizar.';
  return respuesta;
}

async function verificarConGoogleFactCheck(afirmacion) {
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(
    afirmacion
  )}&key=${GOOGLE_FACTCHECK_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.claims || data.claims.length === 0) return [];

  return data.claims.map((claim) => {
    return {
      fuente: claim.claimReview[0].publisher.name,
      veredicto: claim.claimReview[0].text,
    };
  });
}

export async function verificarTexto(texto) {
  console.log('[✔] Analizando texto con OpenAI...');
  const analisis = await analizarTexto(texto);

  const afirmaciones = analisis.match(/- Afirmaci\u00f3n: \"(.*?)\"/g)?.map(x => x.replace('- Afirmación: "', '').replace('"', '')) || [];

  const resultados = [];
  for (const afirmacion of afirmaciones) {
    console.log(`[🧠] Verificando: ${afirmacion}`);
    const googleData = await verificarConGoogleFactCheck(afirmacion);
    const serpData = await buscarEnSerpAPI(afirmacion);
    const newsData = await buscarEnNewsAPI(afirmacion);
    resultados.push({
      afirmacion,
      google: googleData,
      serpapi: serpData,
      newsapi: newsData
    });
  }

  return {
    analisis,
    resultados,
  };
}
  const data = await res.json();
  const respuesta = data.choices?.[0]?.message?.content || 'No se pudo analizar.';
  return respuesta;
}

async function verificarConGoogleFactCheck(afirmacion) {
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(
    afirmacion
  )}&key=${GOOGLE_FACTCHECK_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.claims || data.claims.length === 0) return 'No se encontraron verificaciones.';

  return data.claims.map((claim) => {
    return `Fuente: ${claim.claimReview[0].publisher.name} | Veredicto: ${claim.claimReview[0].text}`;
  });
}

export async function verificarTexto(texto) {
  console.log('[✔] Analizando texto con OpenAI...');
  const analisis = await analizarTexto(texto);

  console.log('[✔] Buscando afirmaciones para verificación...');
  const afirmaciones = analisis.match(/- Afirmación: "(.*?)"/g)?.map(x => x.replace('- Afirmación: "', '').replace('"', '')) || [];

  const resultados = [];
  for (const afirmacion of afirmaciones) {
    console.log(`[🧠] Verificando: ${afirmacion}`);
    const googleData = await verificarConGoogleFactCheck(afirmacion);
    resultados.push({ afirmacion, googleData });
  }

  return {
    analisis,
    resultados,
  };
}
