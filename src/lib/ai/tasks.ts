import { buildTaskPrompt, parseAiTask, SYSTEM_PROMPT, type AiTask } from './resumeIntel';
import { buildTailorPrompt, parseTailorTask, TAILOR_SYSTEM, type TailorTask } from './tailor';

/** Every task the AI bridge accepts. The server only ever builds prompts from these fixed shapes. */
export type AnyAiTask = AiTask | TailorTask;

export const parseAnyTask = (body: unknown): { ok: true; task: AnyAiTask } | { ok: false; error: string } =>
  body && typeof body === 'object' && !Array.isArray(body) && (body as Record<string, unknown>).kind === 'tailor'
    ? parseTailorTask(body as Record<string, unknown>)
    : parseAiTask(body);

export const buildAnyPrompt = (task: AnyAiTask): string => (task.kind === 'tailor' ? buildTailorPrompt(task) : buildTaskPrompt(task));

export const systemFor = (task: AnyAiTask): string => (task.kind === 'tailor' ? TAILOR_SYSTEM : SYSTEM_PROMPT);

/** Lower temperature keeps smaller models on-format for the ID-based tailoring output. */
export const temperatureFor = (task: AnyAiTask): number => (task.kind === 'tailor' ? 0.2 : 0.3);
