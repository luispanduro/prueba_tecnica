/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    // Force Node.js export conditions so msw resolves @mswjs/interceptors
    // to its CJS (Node) files instead of browser .mjs files.
    customExportConditions: ['node', 'node-addons', 'require', 'default'],
  },
  setupFiles: ['<rootDir>/src/jest.polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    // Include .mjs so ts-jest can compile ESM-only packages (e.g. @open-draft/deferred-promise)
    '^.+\\.(t|j)sx?$|^.+\\.mjs$': ['ts-jest', {
      tsconfig: {
        target: 'es2020',
        module: 'commonjs',
        moduleResolution: 'node',
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        verbatimModuleSyntax: false,
        allowImportingTsExtensions: false,
        noEmit: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        allowJs: true,
      },
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    // rettime and until-async are ESM-only and used only by msw's experimental
    // defineNetwork API (not used in our tests). CJS stubs prevent load errors.
    '^rettime$': '<rootDir>/src/__tests__/__mocks__/rettime.cjs',
    '^until-async$': '<rootDir>/src/__tests__/__mocks__/until-async.cjs',
  },
  coverageThreshold: { global: { lines: 60 } },
  testMatch: ['<rootDir>/src/__tests__/**/*.(test|spec).(ts|tsx)'],
  // Transform msw (TypeScript source) and @open-draft (ESM-only .mjs deps of msw).
  // rettime/until-async are handled via moduleNameMapper stubs above.
  transformIgnorePatterns: ['node_modules/(?!(msw|@open-draft)/)'],
};
