import type { Config } from '@netlify/functions';
import { handleOrder } from '../../server/handlers';

export default handleOrder;

export const config: Config = { path: '/api/razorpay/order', method: 'POST' };
