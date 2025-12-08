module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["@typescript-eslint"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "warn",
    "quotes": "off",
    "indent": "off",
    "linebreak-style": "off",
    "max-len": "off",
    "object-curly-spacing": "off",
    "comma-dangle": "off",
    "valid-jsdoc": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/ban-ts-comment": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
    {
      files: [".eslintrc.js"],
      parserOptions: {
        project: null,
      },
    },
  ],
  globals: {},
  ignorePatterns: ["lib/**/*", "node_modules/**/*", "src/dataconnect-admin-generated/**/*"],
};
