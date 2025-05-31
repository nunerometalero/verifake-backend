const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Usa dotenv o variable de entorno
});

module.exports = { openai };
