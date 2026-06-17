import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/main.ts', '!src/**/index.ts', '!src/infrastructure/qdrant/**', '!src/infrastructure/llm/llm-client.service.ts', '!src/infrastructure/http-clients/**', '!src/presentation/controllers/**', '!src/presentation/dtos/**', '!src/app.module.ts'],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
};

export default config;
