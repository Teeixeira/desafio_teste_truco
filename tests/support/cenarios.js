/**
 * Helpers para montar cenários ("Dado") e executar ações ("Quando") de forma legível.
 * Tudo aqui depende apenas da API pública descrita em CONTRATO.md.
 */
const T = require('./impl');
const {
  VALORES,
  NAIPES,
  JOGADORES,
  c,
  cs,
  chave,
  todasAsCartas,
  manilhaLocal,
  proximo,
} = require('./cartas');

// ---------------------------------------------------------------------------
// Montagem de baralhos (D-10)
// ---------------------------------------------------------------------------

/**
 * Monta um baralho de 40 cartas que, distribuído pelo `carteador`, entrega exatamente
 * as `maos` pedidas (na ordem dada) e vira a `vira`.
 * Jogadores com menos de 3 cartas especificadas recebem as cartas comuns mais fracas
 * que sobrarem. Lança erro se o cenário repetir cartas (erro de autoria do teste).
 */
function montarBaralho({ carteador = 'J4', vira = '4♥', maos = {} } = {}) {
  const viraC = typeof vira === 'string' ? c(vira) : vira;
  const usados = new Set();
  const marcar = (carta) => {
    const k = chave(carta);
    if (!VALORES.includes(carta.valor) || !NAIPES.includes(carta.naipe)) {
      throw new Error(`Cenário inválido: carta inexistente ${k}`);
    }
    if (usados.has(k)) throw new Error(`Cenário inválido: carta repetida ${k}`);
    usados.add(k);
  };
  marcar(viraC);

  const maosC = {};
  for (const j of JOGADORES) {
    maosC[j] = cs(maos[j] || []);
    if (maosC[j].length > 3) throw new Error(`Cenário inválido: ${j} com mais de 3 cartas`);
    maosC[j].forEach(marcar);
  }

  const manilha = manilhaLocal(viraC);
  const peso = (x) => (x.valor === manilha ? 100 : VALORES.indexOf(x.valor));
  const sobras = todasAsCartas()
    .filter((x) => !usados.has(chave(x)))
    .sort((a, b) => peso(a) - peso(b));
  for (const j of JOGADORES) {
    while (maosC[j].length < 3) {
      const x = sobras.shift();
      usados.add(chave(x));
      maosC[j].push(x);
    }
  }

  const ordem = [];
  let j = proximo(carteador);
  for (let i = 0; i < 4; i++) {
    ordem.push(j);
    j = proximo(j);
  }

  const baralho = [];
  for (let k = 0; k < 12; k++) baralho.push(maosC[ordem[k % 4]][Math.floor(k / 4)]);
  baralho.push(viraC);
  baralho.push(...todasAsCartas().filter((x) => !usados.has(chave(x))));
  return baralho.map((x) => ({ valor: x.valor, naipe: x.naipe }));
}

/**
 * Gera mãos (vira 4♥, manilha 5) cujas rodadas terminam exatamente com os resultados
 * pedidos, quando cada jogador joga sua 1ª carta restante. Ex.: ['E', 'A'].
 * - 'A': J1 joga a carta mais alta da rodada;
 * - 'B': J2 joga a carta mais alta da rodada;
 * - 'E': J1 e J2 jogam cartas comuns de mesmo valor, mais altas que as de J3 e J4.
 * Os resultados independem de quem abre a rodada.
 */
function maosParaResultados(resultados, { vira = '4♥' } = {}) {
  const viraC = typeof vira === 'string' ? c(vira) : vira;
  const manilha = manilhaLocal(viraC);
  const TOPOS = ['3', '2', 'A'];
  if (TOPOS.includes(manilha)) throw new Error('maosParaResultados exige manilha fora de 3/2/A');
  const fracas = todasAsCartas().filter(
    (x) =>
      VALORES.indexOf(x.valor) < VALORES.indexOf('A') &&
      x.valor !== manilha &&
      chave(x) !== chave(viraC),
  );
  const maos = { J1: [], J2: [], J3: [], J4: [] };
  let f = 0;
  for (let r = 0; r < 3; r++) {
    const res = resultados[r];
    const topo = TOPOS[r];
    for (const j of JOGADORES) {
      let carta = null;
      if ((res === 'A' || res === 'E') && j === 'J1') carta = c(`${topo}♦`);
      if ((res === 'B' || res === 'E') && j === 'J2') carta = c(`${topo}♣`);
      maos[j].push(carta || fracas[f++]);
    }
  }
  return maos;
}

// ---------------------------------------------------------------------------
// Criação de partidas
// ---------------------------------------------------------------------------

function criarJogo({ carteador = 'J4', placar, baralhos, semente = 20261111 } = {}) {
  const opcoes = { carteadorInicial: carteador, semente };
  if (placar) opcoes.placarInicial = { A: placar.A, B: placar.B };
  if (baralhos) opcoes.baralhos = baralhos;
  return T.criarPartida(opcoes);
}

/**
 * Cria a partida com baralho(s) fixo(s) e já distribui a primeira mão.
 * `seguintes` permite fixar as mãos seguintes: [{ vira, maos }, ...]
 * (o carteador de cada uma é calculado pela rotação R-09).
 */
function prepararMao({
  carteador = 'J4',
  vira = '4♥',
  maos = {},
  placar,
  seguintes = [],
  semente,
} = {}) {
  const baralhos = [montarBaralho({ carteador, vira, maos })];
  let d = carteador;
  for (const s of seguintes) {
    d = proximo(d);
    baralhos.push(montarBaralho({ carteador: d, vira: s.vira || '4♥', maos: s.maos || {} }));
  }
  const jogo = criarJogo({ carteador, placar, baralhos, semente });
  esperaOk(jogo.distribuir(), 'distribuir');
  return jogo;
}

// ---------------------------------------------------------------------------
// Asserções de ações
// ---------------------------------------------------------------------------

function esperaOk(res, descricao = 'ação') {
  if (!res || res.ok !== true) {
    throw new Error(
      `Esperava que "${descricao}" fosse aceita, mas foi recusada: ${res && res.motivo}`,
    );
  }
  return res;
}

/**
 * R-38: a ação deve ser recusada com motivo e o estado deve ficar idêntico (TC-INV-12/13).
 */
function esperaRecusa(jogo, acao, padraoMotivo) {
  const antes = jogo.obterEstado();
  let res;
  expect(() => {
    res = acao();
  }).not.toThrow();
  expect(res).toEqual(expect.objectContaining({ ok: false }));
  expect(typeof res.motivo).toBe('string');
  expect(res.motivo.trim().length).toBeGreaterThan(0);
  if (padraoMotivo) expect(res.motivo).toMatch(padraoMotivo);
  expect(jogo.obterEstado()).toEqual(antes);
  return res;
}

// ---------------------------------------------------------------------------
// Jogadas
// ---------------------------------------------------------------------------

/** 'J1 7♦, J2 K♠ coberta' -> [{ jogador, carta, coberta }] */
function parseJogadas(texto) {
  return texto
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [jogador, carta, extra] = s.split(/\s+/);
      return { jogador, carta: c(carta), coberta: extra === 'coberta' };
    });
}

/** Executa as jogadas em sequência, exigindo que todas sejam aceitas. */
function jogar(jogo, texto) {
  for (const { jogador, carta, coberta } of parseJogadas(texto)) {
    esperaOk(
      jogo.jogarCarta(jogador, carta, { coberta }),
      `${jogador} joga ${chave(carta)}${coberta ? ' coberta' : ''}`,
    );
  }
}

/** O jogador da vez joga a primeira carta que tem (por índice na mão de ferro). */
function jogarPrimeira(jogo) {
  const e = jogo.obterEstado();
  const j = e.mao.vez;
  if (!j) throw new Error('jogarPrimeira: não há jogador da vez');
  if (e.mao.tipo === 'ferro') {
    esperaOk(jogo.jogarCarta(j, 0), `${j} joga a 1ª carta oculta`);
  } else {
    const carta = e.mao.cartas[j][0];
    esperaOk(jogo.jogarCarta(j, carta), `${j} joga ${chave(carta)}`);
  }
  return j;
}

/** Joga `n` rodadas completas (4 cartas cada) com jogarPrimeira. */
function jogarRodadas(jogo, n = 1) {
  for (let i = 0; i < 4 * n; i++) jogarPrimeira(jogo);
}

/** Joga até a mão terminar. */
function jogarAteOFim(jogo) {
  for (let i = 0; i < 12 && jogo.obterEstado().estado === 'AGUARDANDO_JOGADA'; i++) {
    jogarPrimeira(jogo);
  }
}

/** proximaMao() + distribuir() */
function proximaMaoDistribuida(jogo) {
  esperaOk(jogo.proximaMao(), 'proximaMao');
  esperaOk(jogo.distribuir(), 'distribuir');
}

// ---------------------------------------------------------------------------
// Leitura do estado
// ---------------------------------------------------------------------------

const estado = (jogo) => jogo.obterEstado();
const maoAtual = (jogo) => jogo.obterEstado().mao;

/** Rodadas que já tiveram pelo menos uma jogada. */
function rodadasJogadas(jogoOuEstado) {
  const e = typeof jogoOuEstado.obterEstado === 'function' ? jogoOuEstado.obterEstado() : jogoOuEstado;
  const rodadas = (e.mao && e.mao.rodadas) || [];
  return rodadas.filter((r) => r.jogadas && r.jogadas.length > 0);
}

const resultadosRodadas = (jogo) => rodadasJogadas(jogo).map((r) => r.resultado);

/** Todas as cartas físicas da mesa: mãos + jogadas + vira + monte. */
function cartasEmJogo(e) {
  const r = [...(e.monte || [])];
  if (e.mao) {
    r.push(e.mao.vira);
    for (const j of JOGADORES) r.push(...(e.mao.cartas[j] || []));
    for (const rod of e.mao.rodadas || []) for (const jg of rod.jogadas || []) r.push(jg.carta);
  }
  return r;
}

/** Varredura profunda: chaves de toda carta ({valor, naipe}) presente no objeto. */
function cartasVisiveis(obj) {
  const achadas = new Set();
  const vistos = new Set();
  (function varrer(x) {
    if (!x || typeof x !== 'object' || vistos.has(x)) return;
    vistos.add(x);
    if (typeof x.valor === 'string' && typeof x.naipe === 'string') achadas.add(chave(x));
    for (const v of Object.values(x)) varrer(v);
  })(obj);
  return [...achadas].sort();
}

const tiposDeAcao = (acoes) => (acoes || []).map((a) => a.tipo).sort();
const acao = (acoes, tipo) => (acoes || []).find((a) => a.tipo === tipo);

/** PRNG determinístico para os testes de propriedade. */
function mulberry32(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = {
  T,
  montarBaralho,
  maosParaResultados,
  criarJogo,
  prepararMao,
  esperaOk,
  esperaRecusa,
  parseJogadas,
  jogar,
  jogarPrimeira,
  jogarRodadas,
  jogarAteOFim,
  proximaMaoDistribuida,
  estado,
  maoAtual,
  rodadasJogadas,
  resultadosRodadas,
  cartasEmJogo,
  cartasVisiveis,
  tiposDeAcao,
  acao,
  mulberry32,
};
