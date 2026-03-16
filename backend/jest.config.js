/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/../tests/backend/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
