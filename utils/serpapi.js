import axios from 'axios';

export async function buscarEnSerpAPI(query) {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!SERPAPI_KEY) return [];

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=es&api_key=${SERPAPI_KEY}`;

  try {
    const res = await axios.get(url);
    const noticias = res.data?.news_results?.slice(0, 3) || [];
    return noticias.map(noticia => ({
      titulo: noticia.title,
      fuente: noticia.source,
      enlace: noticia.link
    }));
  } catch (err) {
    console.error('[❌] Error en SerpAPI:', err.message);
    return [];
  }
}
