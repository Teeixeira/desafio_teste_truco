/**
 * Utilitários de cartas usados pelos testes. São independentes da implementação:
 * os testes nunca dependem de como o jogo representa cartas internamente, apenas de
 * que cada carta seja um objeto com `valor` e `naipe`.
 */

const VALORES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const NAIPES = ['♦', '♠', '♥', '♣'];
const JOGADORES = ['J1', 'J2', 'J3', 'J4'];

/** '7♦' -> { valor: '7', naipe: '♦' } */
function c(texto) {
  if (typeof texto !== 'string' || texto.length < 2) {
    throw new Error(`Carta mal escrita no teste: ${texto}`);
  }
  const naipe = texto.slice(-1);
  const valor = texto.slice(0, -1);
  return { valor, naipe };
}

/** cs('7♦ K♠, A♣') -> [7♦, K♠, A♣] (aceita string separada por espaço/vírgula ou array) */
function cs(...entrada) {
  return entrada
    .flat()
    .flatMap((t) => (typeof t === 'string' ? t.split(/[\s,]+/) : [t]))
    .filter(Boolean)
    .map((t) => (typeof t === 'string' ? c(t) : t));
}

/** Chave canônica de uma carta: '7♦' */
function chave(carta) {
  if (!carta || typeof carta !== 'object') return String(carta);
  return `${carta.valor}${carta.naipe}`;
}

/** Lista de chaves, preservando a ordem */
function chaves(cartas) {
  return (cartas || []).map(chave);
}

/** Lista de chaves ordenada (para comparar conjuntos) */
function conjunto(cartas) {
  return chaves(cartas).sort();
}

/** As 40 cartas em ordem canônica (valor crescente, depois naipe ♦ ♠ ♥ ♣) */
function todasAsCartas() {
  const r = [];
  for (const valor of VALORES) for (const naipe of NAIPES) r.push({ valor, naipe });
  return r;
}

/** Manilha calculada pelo próprio teste (para montar baralhos), sem usar a implementação */
function manilhaLocal(vira) {
  const v = typeof vira === 'string' ? c(vira) : vira;
  return VALORES[(VALORES.indexOf(v.valor) + 1) % VALORES.length];
}

const proximo = (j) => JOGADORES[(JOGADORES.indexOf(j) + 1) % 4];
const duplaLocal = (j) => (j === 'J1' || j === 'J3' ? 'A' : 'B');
const parceiro = (j) => JOGADORES[(JOGADORES.indexOf(j) + 2) % 4];

module.exports = {
  VALORES,
  NAIPES,
  JOGADORES,
  c,
  cs,
  chave,
  chaves,
  conjunto,
  todasAsCartas,
  manilhaLocal,
  proximo,
  duplaLocal,
  parceiro,
};
