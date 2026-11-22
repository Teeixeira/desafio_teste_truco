/**
 * Único ponto em que a suíte carrega a implementação do jogo.
 * Padrão: <raiz>/src (src/index.js). Para testar outro módulo:
 *   TRUCO_IMPL=./outro/caminho npm test
 */
const path = require('path');

const caminho = process.env.TRUCO_IMPL
  ? path.resolve(process.cwd(), process.env.TRUCO_IMPL)
  : path.resolve(__dirname, '..', '..', 'src');

module.exports = require(caminho);
