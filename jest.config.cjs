module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  moduleNameMapper: {
    "^@uiframe/core$": "<rootDir>/components/core/index.js",
    "^@uiframe/(.*)$": "<rootDir>/components/$1.js",
  },
};
