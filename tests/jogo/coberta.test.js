/**
 * 6.7 Carta coberta (TC-COB) — R-12, R-14, R-18, R-34, R-38, D-03
 * Todos com vira 4♥ (manilha 5).
 */
const T = require('../support/impl');
const { c, chaves } = require('../support/cartas');
const {
  prepararMao,
  maosParaResultados,
  jogar,
  jogarRodadas,
  rodadasJogadas,
  esperaOk,
  esperaRecusa,
  cartasVisiveis,
  tiposDeAcao,
} = require('../support/cenarios');

/** J1 vence a 1ª (3♦) e abre a 2ª, com 5♣ (zap) na mão. */
const MAOS_2A_RODADA = {
  J1: ['3♦', '5♣', 'Q♦'],
  J2: ['4♠', '4♦', 'J♠'],
  J3: ['6♦', '6♠', 'K♦'],
  J4: ['7♠', '7♦', 'K♣'],
};

/** 1ª = A (J1), 2ª = B (J2 com 3♣) => J2 abre a 3ª. */
const MAOS_3A_RODADA = {
  J1: ['3♦', '4♦', 'Q♦'],
  J2: ['4♠', '3♣', 'J♠'],
  J3: ['6♦', '6♠', 'K♦'],
  J4: ['7♠', '7♦', 'K♣'],
};

describe('6.7 Carta coberta (TC-COB)', () => {
  test('TC-COB-01 — Coberta proibida na 1ª rodada: recusada, 7♦ continua com J1, vez continua com J1 (R-18, R-38)', () => {
    const jogo = prepararMao({ maos: { J1: ['7♦'] } });
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', c('7♦'), { coberta: true }));
    const e = jogo.obterEstado();
    expect(chaves(e.mao.cartas.J1)).toContain('7♦');
    expect(e.mao.vez).toBe('J1');
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).not.toContain('JOGAR_COBERTA');
  });

  test('TC-COB-02 — Coberta não vale, mesmo sendo o zap: J1 5♣ coberta, J2 4♦, J3 6♠, J4 7♦ => B, vencedor J4 (R-18)', () => {
    const jogo = prepararMao({ maos: MAOS_2A_RODADA });
    jogar(jogo, 'J1 3♦, J2 4♠, J3 6♦, J4 7♠');
    expect(jogo.obterEstado().mao.vez).toBe('J1');
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).toContain('JOGAR_COBERTA');

    jogar(jogo, 'J1 5♣ coberta, J2 4♦, J3 6♠, J4 7♦');
    const r2 = rodadasJogadas(jogo)[1];
    expect(r2.jogadas[0]).toMatchObject({ jogador: 'J1', coberta: true });
    expect(r2.resultado).toBe('B');
    expect(r2.vencedor).toBe('J4');
  });

  test('TC-COB-03 — Coberta não é revelada a J2, J3 e J4; 5♣ saiu da mão de J1 (R-18, R-12)', () => {
    const jogo = prepararMao({ maos: MAOS_2A_RODADA });
    jogar(jogo, 'J1 3♦, J2 4♠, J3 6♦, J4 7♠');
    jogar(jogo, 'J1 5♣ coberta');

    expect(chaves(jogo.obterEstado().mao.cartas.J1)).not.toContain('5♣');

    for (const j of ['J2', 'J3', 'J4']) {
      const v = jogo.visao(j);
      expect(cartasVisiveis(v)).not.toContain('5♣');
      const r2 = v.rodadas.filter((r) => r.jogadas && r.jogadas.length > 0)[1];
      expect(r2.jogadas[0].jogador).toBe('J1');
      expect(r2.jogadas[0].coberta).toBe(true);
      expect(r2.jogadas[0].carta == null).toBe(true); // sem valor nem naipe
      expect(v.quantidadeCartas.J1).toBe(1);
    }
  });

  test('TC-COB-04 — Coberta permitida na 3ª rodada: aceita, força = −1 (R-18)', () => {
    const jogo = prepararMao({ maos: MAOS_3A_RODADA });
    jogar(jogo, 'J1 3♦, J2 4♠, J3 6♦, J4 7♠'); // A (J1)
    jogar(jogo, 'J1 4♦, J2 3♣, J3 6♠, J4 7♦'); // B (J2)
    expect(jogo.obterEstado().mao.vez).toBe('J2');

    esperaOk(jogo.jogarCarta('J2', c('J♠'), { coberta: true }), 'J2 joga J♠ coberta');
    const r3 = rodadasJogadas(jogo)[2];
    expect(r3.jogadas[0]).toMatchObject({ jogador: 'J2', coberta: true });
    expect(T.forca(c('J♠'), '5', true)).toBe(-1);
  });

  test('TC-COB-05 — Todas cobertas: rodada empata (R-18, D-03)', () => {
    const jogo = prepararMao({ maos: MAOS_2A_RODADA });
    jogar(jogo, 'J1 3♦, J2 4♠, J3 6♦, J4 7♠');
    jogar(jogo, 'J1 5♣ coberta, J2 4♦ coberta, J3 6♠ coberta, J4 7♦ coberta');
    const r2 = rodadasJogadas(jogo)[1];
    expect(r2.resultado).toBe('E');
    expect(r2.vencedor).toBeNull();
    // A venceu a 1ª e a 2ª empatou: A vence a mão (R-20)
    expect(jogo.obterEstado().mao.resultado).toBe('A');
  });

  test('TC-COB-06 — Única carta aberta vence: J1 4♦ aberta; J2, J3 e J4 cobertas => A, vencedor J1 (R-18)', () => {
    const jogo = prepararMao({ maos: MAOS_3A_RODADA });
    jogar(jogo, 'J1 3♦, J2 4♠, J3 6♦, J4 7♠');
    jogar(jogo, 'J1 4♦, J2 3♣ coberta, J3 6♠ coberta, J4 7♦ coberta');
    const r2 = rodadasJogadas(jogo)[1];
    expect(r2.resultado).toBe('A');
    expect(r2.vencedor).toBe('J1');
  });

  test('TC-COB-07 — Coberta proibida na mão de ferro (R-18, R-34)', () => {
    const jogo = prepararMao({ placar: { A: 11, B: 11 }, maos: maosParaResultados(['A', 'B', 'A']) });
    expect(jogo.obterEstado().mao.tipo).toBe('ferro');
    jogarRodadas(jogo, 1);
    const vez = jogo.obterEstado().mao.vez;
    expect(rodadasJogadas(jogo)).toHaveLength(1);
    esperaRecusa(jogo, () => jogo.jogarCarta(vez, 0, { coberta: true }));
    expect(tiposDeAcao(jogo.acoesDisponiveis(vez))).not.toContain('JOGAR_COBERTA');
  });

  test('TC-COB-08 — Coberta conta como carta jogada e não pode ser jogada de novo (R-14, R-18)', () => {
    const jogo = prepararMao({ maos: MAOS_2A_RODADA });
    jogar(jogo, 'J1 3♦, J2 4♠, J3 6♦, J4 7♠');
    jogar(jogo, 'J1 5♣ coberta');
    expect(jogo.obterEstado().mao.cartas.J1).toHaveLength(1);

    jogar(jogo, 'J2 4♦, J3 6♠, J4 7♦'); // B vence a 2ª (J4), J4 abre a 3ª
    jogar(jogo, 'J4 K♣');
    expect(jogo.obterEstado().mao.vez).toBe('J1');
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', c('5♣')));
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', c('5♣'), { coberta: true }));
  });
});
