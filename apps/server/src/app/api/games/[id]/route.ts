import { askQuestion, beginDefense, defend, makeGuess } from '@yes-or-no/game-engine';
import { actionRequestSchema } from '@yes-or-no/shared';
import { answerQuestion, defenseQuestion, nextDefenseGuess } from '@/server/ai';
import { getSession, saveGame } from '@/server/sessions';
import { getLoginSession } from '@/server/auth-sessions';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const session = getSession((await context.params).id, (await getLoginSession())?.userKey ?? null);
  if (!session) return Response.json({ error: 'Game not found' }, { status: 404 });
  return Response.json({ game: session.game });
}

export async function POST(request: Request, context: Context) {
  const id = (await context.params).id;
  const session = getSession(id, (await getLoginSession())?.userKey ?? null);
  if (!session) return Response.json({ error: 'Game not found' }, { status: 404 });
  const body = await request.json().catch(() => null);
  const parsed = actionRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid action' }, { status: 400 });
  if (parsed.data.kind === 'next') {
    if (session.game.mode !== 'both' || session.game.phase !== 'attack' || session.game.status === 'playing') {
      return Response.json({ error: 'Finish the attack first' }, { status: 409 });
    }
    const game = beginDefense(session.game, defenseQuestion(0));
    saveGame(id, game);
    return Response.json({ game });
  }
  if (session.game.status !== 'playing') return Response.json({ error: 'Game has ended' }, { status: 409 });
  if (session.game.phase === 'defense' && parsed.data.kind !== 'answer' || session.game.phase === 'attack' && parsed.data.kind === 'answer') {
    return Response.json({ error: 'Wrong action for this round' }, { status: 409 });
  }

  try {
    const action = parsed.data;
    const game = action.kind === 'answer'
      ? defend(session.game, action.reply,
          await nextDefenseGuess(session.game.category, session.game.history, session.game.questionCount),
          [session.defenseAnswer?.name ?? session.answer.name, ...(session.defenseAnswer?.aliases ?? session.answer.aliases)],
          defenseQuestion(session.game.questionCount + 1))
      : action.kind === 'guess'
        ? makeGuess(session.game, action.text, [session.answer.name, ...session.answer.aliases])
        : askQuestion(session.game, action.text, await answerQuestion(session.answer, session.game.category, action.text));
    saveGame(id, game);
    return Response.json({ game });
  } catch {
    return Response.json({ error: 'Could not complete action' }, { status: 502 });
  }
}