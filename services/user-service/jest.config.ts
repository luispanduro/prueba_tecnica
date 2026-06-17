import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/main.ts', '!src/**/index.ts', '!src/infrastructure/persistence/migrations/**', '!src/infrastructure/persistence/data-source.ts', '!src/infrastructure/persistence/entities/**', '!src/infrastructure/persistence/repositories/**', '!src/infrastructure/cache/**', '!src/infrastructure/http-clients/**', '!src/presentation/controllers/**', '!src/presentation/dtos/**', '!src/app.module.ts'],
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
