import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@yes-or-no/shared', '@yes-or-no/game-engine', '@yes-or-no/question-bank'],
};

export default config;