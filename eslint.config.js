const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      // Code style and formatting
      'indent': ['error', 2],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',

      // Variable naming and declarations
      'camelcase': ['error', { 'properties': 'always' }],
      'no-unused-vars': ['error', {
        'vars': 'all',
        'args': 'after-used',
        'argsIgnorePattern': '^(request|response|nextMiddleware)$'
      }],
      'no-var': 'error',
      'prefer-const': 'error',

      // Best practices
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',
      'no-with': 'error',

      // Error prevention
      'no-undef': 'error',
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Node.js specific
      'no-path-concat': 'error',
      'no-process-exit': 'error',

      // Express.js specific patterns
      'consistent-return': 'error',
      'no-param-reassign': ['error', { 'props': false }]
    },
    files: ['**/*.js'],
    ignores: [
      'node_modules/**',
      'public/js/**',
      'public/validators/**',
      'uploads/**',
      'coverage/**',
      '*.min.js'
    ]
  }
];
