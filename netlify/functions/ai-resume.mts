import type { Config } from '@netlify/functions';
import { handleAiResume } from '../../server/ai';

export default handleAiResume;

export const config: Config = { path: '/api/ai/resume', method: 'POST' };
