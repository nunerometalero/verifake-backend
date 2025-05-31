const axios = require('axios');

async function verificarConGoogleFactCheck(text) {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(text)}&key=${apiKey}&languageCode=es`;

  try {
    const response = await axios.get(url);
    const claims = response.data.claims || [];

    if (claims.length === 0) return [];

    return claims.map(claim => ({
      texto: claim.text,
      veredicto: claim.claimReview?.[0]?.textualRating || 'Sin calificación',
      fuente: claim.claimReview?.[0]?.publisher?.name || 'Desconocido'
    }));
  } catch (err) {
    console.error('[❌] Error en Google Fact Check:', err.message);
    return [];
  }
}

module.exports = { verificarConGoogleFactCheck };
