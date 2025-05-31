const axios = require('axios');

async function verificarConGoogleFactCheck(text) {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(text)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const claims = response.data.claims || [];

    if (claims.length === 0) return 'No se encontraron resultados en Google Fact Check.';

    const summaries = claims.map(claim => {
      const text = claim.text;
      const rating = claim.claimReview?.[0]?.textualRating || 'Sin calificación';
      const publisher = claim.claimReview?.[0]?.publisher?.name || 'Fuente desconocida';
      return `• ${text} — ${rating} (${publisher})`;
    });

    return summaries.join('\n');
  } catch (err) {
    console.error('Error en Google Fact Check:', err);
    return 'Error al consultar Google Fact Check.';
  }
}

module.exports = { verificarConGoogleFactCheck };
