import axios from 'axios';

export async function buscarEnNewsAPI(query) {
  const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
  if (!NEWSAPI_KEY) return [];

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=es&apiKey=${NEWSAPI_KEY}`;

  try {
    const res = await axios.get(url);
    const noticias = res.data?.articles?.slice(0, 3) || [];
    return noticias.map(noticia => ({
      titulo: noticia.title,
      fuente: noticia.source.name,
      enlace: noticia.url
    }));
  } catch (err) {
    console.error('[❌] Error en NewsAPI:', err.message);
    return [];
  }
}
