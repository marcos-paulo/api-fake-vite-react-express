import express from 'express';

import { getConfig } from '../../shared/config';
import { createServerEndpointsManager } from './dynamic-endpoints';
import { registerCorsMiddleware } from './middleware/cors-middleware';
import { registerDynamicEndpointsMiddleware } from './middleware/dynamic-endpoints-middleware';
import { registerGlobalErrorHandler } from './middleware/global-error-handler';
import { registerProductionStaticMiddleware } from './middleware/production-static-middleware';
import { registerRequestLoggerMiddleware } from './middleware/request-logger-middleware';
import { registerChangeActiveHandlerRoute } from './routes/change-active-handler-route';
import { registerChangeStateEndpointRoute } from './routes/change-state-endpoint-route';
import { registerEndpointsRoute } from './routes/endpoints-route';
import { registerEventsRoute } from './routes/events-route';
import { registerOpenEndpointFileRoute } from './routes/open-endpoint-file-route';
import { registerShutdownRoute } from './routes/shutdown-route';
import { registerSimulateErrorRoute } from './routes/simulate-error-route';
import { startServerBootstrap } from './server-bootstrap';

export const app = express();

const CLIENT_APP_PORT = getConfig().API_PORT ?? 3000;

createServerEndpointsManager();

registerRequestLoggerMiddleware(app);

app.use(express.json());

registerCorsMiddleware(app);

registerEventsRoute(app);
registerEndpointsRoute(app);
registerChangeStateEndpointRoute(app);
registerChangeActiveHandlerRoute(app);
registerOpenEndpointFileRoute(app);
registerShutdownRoute(app);

registerSimulateErrorRoute(app);

registerDynamicEndpointsMiddleware(app);

registerProductionStaticMiddleware(app);

registerGlobalErrorHandler(app);

startServerBootstrap(app, CLIENT_APP_PORT);
