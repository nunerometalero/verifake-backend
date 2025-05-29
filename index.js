
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/api/analyze', async (req, res) => {
  const { text, url } = req.body;

  if (!text || text.length < 50) {
    return res.status(400).json({ error: 'Texto insuficiente para analizar.' });
  }

  const prompt = `Analiza el siguiente contenido web para detectar posibles fake news:

URL: ${url}
Dominio: ${new URL(url).hostname}

CONTENIDO:
${text}

Evalúa:
1. Veracidad de las afirmaciones
2. Presencia de fuentes confiables
3. Indicadores de desinformación
4. Coherencia y lógica del contenido

Responde en JSON con este formato exacto:
{
  "classification": "VERDADERO|DUDOSO|FALSO",
  "explanation": "Explicación detallada...",
  "confidence": "alto|medio|bajo",
  "indicators": ["lista", "de", "indicadores", "encontrados"]
}`;

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: "Eres un verificador experto en detectar desinformación y fake news. Responde solo con el JSON especificado."
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 600
    });

    const content = completion.data.choices[0].message.content;

    try {
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (parseError) {
      res.status(500).json({ error: 'Error al interpretar la respuesta del modelo.', raw: content });
    }
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error);
    res.status(500).json({ error: 'Error al comunicarse con OpenAI' });
  }
});

app.listen(port, () => {
  console.log(`Servidor VERIFAKE escuchando en http://localhost:${port}`);
});
