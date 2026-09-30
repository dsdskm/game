import { z } from 'zod';
import { hasAdminAccess } from '@/server/admin-access';
import { generateRandomTopic, generateWord } from '@/server/ai';
import { getSavedTopicPrompt, getSavedWordPrompt, saveSavedTopicPrompt, saveSavedWordPrompt } from '@/server/word-prompt-db';

const generateSchema = z.object({ topic: z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('random') }),
  z.object({ kind: z.literal('custom'), category: z.string().trim().min(1).max(40) }),
]) });

function authorized(request: Request): boolean {
  return hasAdminAccess(request.headers.get('x-admin-internal-token'));
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json({ prompt: getSavedWordPrompt() ?? '', topicPrompt: getSavedTopicPrompt() ?? '' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not load prompt' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = z.object({ kind: z.enum(['word', 'topic']).default('word'), prompt: z.string() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Invalid prompt' }, { status: 400 });
  try {
    const prompt = body.data.kind === 'topic' ? saveSavedTopicPrompt(body.data.prompt) : saveSavedWordPrompt(body.data.prompt);
    return Response.json({ prompt });
  } catch (error) {
    if (error instanceof Error && /^(Topic prompt|Prompt must)/.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ error: 'Could not save prompt' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = generateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Invalid topic' }, { status: 400 });
  try {
    if (body.data.topic.kind === 'random') return Response.json({ category: await generateRandomTopic() });
    const category = body.data.topic.category;
    return Response.json({ category, word: await generateWord(category) });
  } catch {
    return Response.json({ error: 'Word generation failed. Check the AI key, prompt and API availability.' }, { status: 502 });
  }
}