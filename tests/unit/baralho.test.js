/**
 * 6.1 Baralho (TC-BAR) — R-03, R-10, R-11, D-10
 */
const T = require('../support/impl');
const { VALORES, NAIPES, chave, chaves, conjunto, todasAsCartas } = require('../support/cartas');
const {
  prepararMao,
  maosParaResultados,
  jogarAteOFim,
  esperaOk,
  cartasEmJogo,
} = require('../support/cenarios');

describe('6.1 Baralho (TC-BAR)', () => {
  test('TC-BAR-01 — Baralho tem 40 cartas, todas diferentes (R-03)', () => {
    const baralho = T.criarBaralho();
    expect(baralho).toHaveLength(40);
    expect(new Set(chaves(baralho)).size).toBe(40);
  });

  test('TC-BAR-02 — Cartas excluídas: não existem 8, 9, 10 nem coringas (R-03)', () => {
    const baralho = T.criarBaralho();
    for (const carta of baralho) {
      expect(['8', '9', '10']).not.toContain(carta.valor);
      expect(VALORES).toContain(carta.valor);
      expect(NAIPES).toContain(carta.naipe);
    }
    expect(chaves(baralho).some((k) => /coringa|joker/i.test(k))).toBe(false);
  });

  test('TC-BAR-03 — Cada um dos 10 valores aparece exatamente 1 vez em ♦, ♠, ♥ e ♣ (R-03)', () => {
    const baralho = T.criarBaralho();
    for (const valor of VALORES) {
      const naipes = baralho.filter((x) => x.valor === valor).map((x) => x.naipe).sort();
      expect(naipes).toEqual([...NAIPES].sort());
    }
    expect(conjunto(baralho)).toEqual(conjunto(todasAsCartas()));
  });

  test('TC-BAR-04 — Embaralhar preserva as cartas (R-03, R-10)', () => {
    const baralho = T.criarBaralho();
    const ordemOriginal = chaves(baralho);
    const embaralhado = T.embaralhar(baralho, 123);

    expect(embaralhado).toHaveLength(40);
    expect(conjunto(embaralhado)).toEqual(conjunto(baralho));
    expect(new Set(chaves(embaralhado)).size).toBe(40);
    // não altera o array recebido
    expect(chaves(baralho)).toEqual(ordemOriginal);
  });

  test('TC-BAR-04 — Embaralhar sem semente também preserva as 40 cartas', () => {
    const baralho = T.criarBaralho();
    const embaralhado = T.embaralhar(baralho);
    expect(conjunto(embaralhado)).toEqual(conjunto(baralho));
  });

  test('TC-BAR-05 — Embaralhamento reproduzível com semente (D-10)', () => {
    const a = T.embaralhar(T.criarBaralho(), 42);
    const b = T.embaralhar(T.criarBaralho(), 42);
    const d = T.embaralhar(T.criarBaralho(), 43);
    expect(chaves(a)).toEqual(chaves(b));
    expect(chaves(d)).not.toEqual(chaves(a));
    expect(conjunto(d)).toEqual(conjunto(a));
  });

  test('TC-BAR-06 — Baralho recomposto a cada mão (R-11)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    jogarAteOFim(jogo);
    const fim = jogo.obterEstado();
    expect(fim.estado).toBe('MAO_ENCERRADA');

    esperaOk(jogo.proximaMao(), 'proximaMao');
    const antes = jogo.obterEstado();
    expect(antes.estado).toBe('AGUARDANDO_DISTRIBUICAO');
    // monte volta a ter 40 cartas e nenhum jogador fica com carta da mão anterior
    expect(antes.monte).toHaveLength(40);
    expect(new Set(chaves(antes.monte)).size).toBe(40);
    expect(antes.mao).toBeNull();

    esperaOk(jogo.distribuir(), 'distribuir');
    const depois = jogo.obterEstado();
    const todas = cartasEmJogo(depois);
    expect(todas).toHaveLength(40);
    expect(new Set(todas.map(chave)).size).toBe(40);
    for (const j of ['J1', 'J2', 'J3', 'J4']) expect(depois.mao.cartas[j]).toHaveLength(3);
  });
});
