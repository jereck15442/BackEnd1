import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './config/env.js';
import { apiRateLimit } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRoutes } from './routes/auth.routes.js';
import { productRoutes } from './routes/product.routes.js';
import { cartRoutes } from './routes/cart.routes.js';
import { couponRoutes } from './routes/coupon.routes.js';
import { orderRoutes } from './routes/order.routes.js';
import { buildRoutes } from './routes/build.routes.js';
import { compatibilityRoutes } from './routes/compatibility.routes.js';
import { advisorRoutes } from './routes/advisor.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';

export const app = express();

app.set('trust proxy', env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet());
app.use(cors());
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRateLimit);

const openapiPath = path.resolve('openapi.yaml');
const openapi = fs.existsSync(openapiPath)
  ? YAML.parse(fs.readFileSync(openapiPath, 'utf8'))
  : { openapi: '3.0.3', info: { title: 'PC Parts Store API', version: '1.0.0' }, paths: {} };

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/builds', buildRoutes);
app.use('/api/v1/compatibility', compatibilityRoutes);
app.use('/api/v1/advisor', advisorRoutes);
app.use('/api/v1/payments', paymentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
