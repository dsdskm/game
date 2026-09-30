export type Answer = { name: string; aliases: readonly string[]; attributes: readonly string[] };

export type BankCategory = 'animals' | 'food';

const bank: Record<BankCategory, readonly Answer[]> = {
  animals: [
    { name: 'cat', aliases: ['kitty', '고양이'], attributes: ['pet', 'fur', '털', 'four legs', 'meows', '야옹'] },
    { name: 'dolphin', aliases: ['porpoise', '돌고래'], attributes: ['ocean', '바다', 'swim', '수영', 'mammal', '포유류'] },
    { name: 'elephant', aliases: ['코끼리'], attributes: ['large', '크다', 'trunk', '코', 'mammal', '포유류', 'four legs'] },
  ],
  food: [
    { name: 'pizza', aliases: ['피자'], attributes: ['cheese', '치즈', 'baked', '구운', 'savory'] },
    { name: 'apple', aliases: ['사과'], attributes: ['fruit', '과일', 'sweet', '달다', 'tree', '나무'] },
    { name: 'sushi', aliases: ['초밥'], attributes: ['rice', '밥', 'fish', '생선', 'Japanese', '일본'] },
  ],
};

export function pickAnswer(category: BankCategory): Answer {
  const answers = bank[category];
  const answer = answers[Math.floor(Math.random() * answers.length)];
  const shortName = [answer.name, ...answer.aliases].find((name) => Array.from(name).length <= 5);
  return { ...answer, name: shortName ?? answer.name };
}

export function knownAttributes(category: BankCategory): readonly string[] {
  return bank[category].flatMap((answer) => answer.attributes);
}

export function candidateWords(category: BankCategory): readonly string[] {
  return bank[category].map((answer) => [answer.name, ...answer.aliases].find((name) => Array.from(name).length <= 5) ?? answer.name);
}

export function findAnswer(category: BankCategory, word: string): Answer | undefined {
  const normalized = word.normalize('NFKC').trim().toLocaleLowerCase();
  return bank[category].find((answer) => [answer.name, ...answer.aliases].some((name) => name.normalize('NFKC').toLocaleLowerCase() === normalized));
}