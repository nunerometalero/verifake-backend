
# VERIFAKE Backend

Este servidor Express expone una API en `/api/analyze` para recibir texto y analizarlo con OpenAI.

## Configuración

1. Copia `.env.example` a `.env` y añade tu clave de OpenAI.
2. Ejecuta:

```bash
npm install
npm start
```

## En Render

- Tipo: Web Service
- Ruta de entrada: `api/analyze`
- Variable de entorno:
  - `OPENAI_API_KEY`: tu clave secreta
