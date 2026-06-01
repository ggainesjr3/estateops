/** @type {import('jest').Config} */
module.exports = {
  cache: false,
  setupFiles: ['<rootDir>/jest.setup.js'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': '<rootDir>/jest.swc-transformer.js',
  },
  moduleNameMapper: {
    '^@api/(.*)$': '<rootDir>/src/$1',
    '^ansis$': require.resolve('ansis'),
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
};
