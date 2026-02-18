import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp(env);

app.listen(env.port, () => {
  console.log(`MySlime server running on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`Database URL configured: ${Boolean(env.databaseUrl)}`);
  console.log(`Allowed CORS origins: ${env.corsOrigins.join(', ') || '(none configured)'}`);
});
