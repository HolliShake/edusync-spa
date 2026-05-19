import { defineConfig } from 'orval';

const backendBaseUrl = process.env.VITE_APP_API_URL_BACKEND ?? 'http://localhost:8080';
const openApiSpecUrl = `${backendBaseUrl.replace(/\/$/, '')}/openapi/v1.json`;

export default defineConfig({
  edusync: {
    input: {
      target: openApiSpecUrl,
    },
    output: {
      target: './src/lib/orval/endpoints.ts',
      schemas: './src/lib/orval/model',
      client: 'axios',
      mode: 'split',
      clean: true,
      formatter: 'prettier',
      override: {
        mutator: {
          path: './src/lib/orval-client/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
