import { beginDefense, newGame } from '@yes-or-no/game-engine';
import type { Answer } from '@yes-or-no/question-bank';
import { startRequestSchema } from '@yes-or-no/shared';
import { createSession } from '@/server/sessions';
import { getLoginSession } from '@/server/auth-sessions';
import { defenseQuestion, generateWord, isValidWord } from '@/server/ai';
import { isBankCategory, mockPickWord, mockValidateWord, pickCategory, validateSetup } from '@/server/setup';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = startRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid game settings' }, { status: 400 });

  const ownerKey = (await getLoginSession())?.userKey ?? null;
  const settings = parsed.data;
  const issue = validateSetup(settings, ownerKey !== null);
  if (issue) return Response.json({ error: issue }, { status: ownerKey === null && /로그인/.test(issue) ? 403 : 400 });

  try {
    let category = settings.category;
    let defenseAnswer: Answer | undefined;
    if (settings.word) {
      const word = settings.word.normalize('NFKC').trim();
      const matched = category === 'random'
        ? mockValidateWord('animals', word) ?? mockValidateWord('food', word)
        : mockValidateWord(category, word);
      if (category === 'random') {
        category = matched ? (mockValidateWord('animals', word) ? 'animals' : 'food') : 'random';
      }
      const valid = process.env.OPENAI_API_KEY ? await isValidWord(word, category) : !!matched;
      if (!valid) return Response.json({ error: '해당 카테고리에 맞는 단어인지 확인해 주세요.' }, { status: 422 });
      defenseAnswer = matched ?? { name: word, aliases: [], attributes: [] };
      if (category === 'random') category = '자유 주제';
    }
    if (category === 'random') category = pickCategory();
    const answer: Answer = settings.mode === 'defense' ? defenseAnswer! : process.env.OPENAI_API_KEY
      ? { name: await generateWord(category), aliases: [], attributes: [] }
      : isBankCategory(category) ? mockPickWord(category) : { name: await generateWord(category), aliases: [], attributes: [] };

    let game = newGame(crypto.randomUUID(), category, settings.maxQuestions, settings.mode);
    if (settings.mode === 'defense') game = beginDefense(game, defenseQuestion(0));
    createSession(game, answer, ownerKey, defenseAnswer);
    return Response.json({ game }, { status: 201 });
  } catch {
    return Response.json({ error: '단어를 준비하지 못했습니다. AI 설정을 확인하거나 랜덤 카테고리를 선택해 주세요.' }, { status: 503 });
  }
}