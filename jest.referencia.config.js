/**
 * Roda a suíte contra a implementação de referência (pasta referencia/), em vez de src/.
 * Uso: npm run test:referencia
 */
const path = require('path');

process.env.TRUCO_IMPL = path.join(__dirname, 'referencia');

module.exports = require('./jest.config');
