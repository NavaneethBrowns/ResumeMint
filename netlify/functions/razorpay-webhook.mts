import type { Config } from '@netlify/functions';
import { handleWebhook } from '../../server/handlers';

export default handleWebhook;

export const config: Config = { path: '/api/razorpay/webhook', method: 'POST' };
