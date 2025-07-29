const js = require('@eslint/js');

module.exports = [
  {
    files: ['routes/**/*.js', 'controllers/**/*.js', 'middlewares/**/*.js', 'validators/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
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
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      
      ...js.configs.recommended.rules,
      
     
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      
      
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      
   
      'no-console': ['warn', {
        allow: ['error', 'warn'] 
        
      }],
      'eqeqeq': ['error', 'always'],
      'no-trailing-spaces': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'public/**',
      'uploads/**',
      'views/**',
      '*.min.js',
      'dist/**',
      'build/**',
    ],
  },
];
