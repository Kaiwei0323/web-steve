module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testMatch: [
    '**/tests/**/*.js',
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],
  verbose: true
}; 