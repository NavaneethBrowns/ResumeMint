import type { Config } from '@netlify/functions';
import { handleVerify } from '../../server/handlers';

export default handleVerify;

export const config: Config = { path: '/api/razorpay/verify', method: 'POST' };
