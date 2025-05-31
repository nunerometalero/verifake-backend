const { openai } = require('./openaiConfig');

async function analizarTexto(texto) {
  const prompt = `
Actúa como un extractor de hechos clave verificables. Se te proporciona un texto que puede contener opiniones, ironías o sesgos. Ignora el tono o lenguaje subjetivo y enfócate solo en identificar hechos clave objetivos que se puedan verificar, como nombres de países, líderes, acusaciones, eventos, lugares, fechas, etc.

Devuelve las afirmaciones en este formato exacto:
- Afirmación: "..."

Texto a analizar:
"""${texto}"""
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('[VERIFAKE] Error en analizarTexto:', error.message);
    return '';
  }
}

module.exports = { analizarTexto };
