const { openai } = require('./openaiConfig');

async function analizarTexto(texto) {
  const prompt = `
Actúa como un verificador de información. Lee el siguiente texto y extrae afirmaciones relevantes que se puedan contrastar. Devuélvelas con el siguiente formato:

- Afirmación: "..."

Texto a analizar:
"""${texto}"""
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
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
