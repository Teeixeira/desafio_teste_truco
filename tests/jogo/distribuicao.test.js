/**
 * 6.4 Distribuição, carteador e ordem (TC-DIS) — R-01, R-02, R-09, R-11, R-14, D-10
 */
const T = require('../support/impl');
const { JOGADORES, chave, chaves, todasAsCartas, duplaLocal } = require('../support/cartas');
const {
  criarJogo,
  prepararMao,
  maosParaResultados,
  esperaOk,
  jogarPrimeira,
  jogarAteOFim,
  rodadasJogadas,
  cartasEmJogo,
} = require('../support/cenarios');

describe('6.4 Distribuição, carteador e ordem (TC-DIS)', () => {
  test('TC-DIS-01 — Quantidade de cartas: 3 por jogador, 1 vira, 27 no monte (R-11)', () => {
    const jogo = T.criarPartida({ semente: 99, carteadorInicial: 'J4' });
    esperaOk(jogo.distribuir(), 'distribuir');
    const e = jogo.obterEstado();
    for (const j of JOGADORES) expect(e.mao.cartas[j]).toHaveLength(3);
    expect(e.mao.vira).toEqual(expect.objectContaining({ valor: expect.any(String), naipe: expect.any(String) }));
    expect(e.monte).toHaveLength(27);
  });

  test('TC-DIS-02 — Cartas não se repetem: 12 das mãos + vira = 13 distintas (R-03, R-11)', () => {
    const jogo = T.criarPartida({ semente: 7, carteadorInicial: 'J4' });
    esperaOk(jogo.distribuir(), 'distribuir');
    const e = jogo.obterEstado();
    const treze = [...JOGADORES.flatMap((j) => chaves(e.mao.cartas[j])), chave(e.mao.vira)];
    expect(new Set(treze).size).toBe(13);
    const todas = cartasEmJogo(e).map(chave);
    expect(todas).toHaveLength(40);
    expect(new Set(todas).size).toBe(40);
  });

  test('TC-DIS-03 — Ordem de distribuição com carteador J4 (R-11, D-10)', () => {
    const fixo = todasAsCartas(); // c1 = fixo[0] ... c13 = fixo[12]
    const k = (n) => chave(fixo[n - 1]);
    const jogo = criarJogo({ carteador: 'J4', baralhos: [fixo] });
    esperaOk(jogo.distribuir(), 'distribuir');
    const e = jogo.obterEstado();
    expect(chaves(e.mao.cartas.J1)).toEqual([k(1), k(5), k(9)]);
    expect(chaves(e.mao.cartas.J2)).toEqual([k(2), k(6), k(10)]);
    expect(chaves(e.mao.cartas.J3)).toEqual([k(3), k(7), k(11)]);
    expect(chaves(e.mao.cartas.J4)).toEqual([k(4), k(8), k(12)]);
    expect(chave(e.mao.vira)).toBe(k(13));
    expect(chaves(e.monte).sort()).toEqual(fixo.slice(13).map(chave).sort());
  });

  test('TC-DIS-04 — Ordem de distribuição com carteador J2 (R-11)', () => {
    const fixo = todasAsCartas();
    const k = (n) => chave(fixo[n - 1]);
    const jogo = criarJogo({ carteador: 'J2', baralhos: [fixo] });
    esperaOk(jogo.distribuir(), 'distribuir');
    const e = jogo.obterEstado();
    expect(chaves(e.mao.cartas.J3)).toEqual([k(1), k(5), k(9)]);
    expect(chaves(e.mao.cartas.J4)).toEqual([k(2), k(6), k(10)]);
    expect(chaves(e.mao.cartas.J1)).toEqual([k(3), k(7), k(11)]);
    expect(chaves(e.mao.cartas.J2)).toEqual([k(4), k(8), k(12)]);
    expect(chave(e.mao.vira)).toBe(k(13));
  });

  test('TC-DIS-05 — Quem abre a 1ª rodada com carteador J4: J1 (R-14)', () => {
    const jogo = prepararMao({ carteador: 'J4' });
    expect(jogo.obterEstado().mao.vez).toBe('J1');
  });

  test('TC-DIS-06 — Quem abre a 1ª rodada com carteador J2: J3 (R-14)', () => {
    const jogo = prepararMao({ carteador: 'J2' });
    expect(jogo.obterEstado().mao.vez).toBe('J3');
  });

  test('TC-DIS-07 — Rotação do carteador em 5 mãos: J4, J1, J2, J3, J4 (R-09)', () => {
    const jogo = T.criarPartida({ semente: 5, carteadorInicial: 'J4' });
    const carteadores = [];
    for (let m = 0; m < 5; m++) {
      esperaOk(jogo.distribuir(), `distribuir mão ${m + 1}`);
      const e = jogo.obterEstado();
      carteadores.push(e.carteador);
      expect(e.mao.vez).toBe(T.proximoJogador(e.carteador));
      jogarAteOFim(jogo);
      expect(jogo.obterEstado().estado).toBe('MAO_ENCERRADA');
      if (m < 4) esperaOk(jogo.proximaMao(), 'proximaMao');
    }
    expect(carteadores).toEqual(['J4', 'J1', 'J2', 'J3', 'J4']);
  });

  test('TC-DIS-08 — Rotação não depende de quem vence: dupla A vence as mãos 1 e 2, carteador da mão 3 = J2 (R-09)', () => {
    const jogo = prepararMao({
      carteador: 'J4',
      maos: maosParaResultados(['A', 'A']),
      seguintes: [{ maos: maosParaResultados(['A', 'A']) }],
    });
    jogarAteOFim(jogo);
    expect(jogo.obterEstado().mao.resultado).toBe('A');
    esperaOk(jogo.proximaMao());
    expect(jogo.obterEstado().carteador).toBe('J1');
    esperaOk(jogo.distribuir());
    jogarAteOFim(jogo);
    expect(jogo.obterEstado().mao.resultado).toBe('A');
    expect(jogo.obterEstado().placar).toEqual({ A: 2, B: 0 });
    esperaOk(jogo.proximaMao());
    expect(jogo.obterEstado().carteador).toBe('J2');
    esperaOk(jogo.distribuir());
    expect(jogo.obterEstado().mao.vez).toBe('J3');
  });

  test('TC-DIS-09 — Ordem de jogo na rodada aberta por J3: J3 → J4 → J1 → J2 (R-02, R-14, D-01)', () => {
    const jogo = prepararMao({ carteador: 'J2' });
    const vezes = [];
    for (let i = 0; i < 4; i++) vezes.push(jogarPrimeira(jogo));
    expect(vezes).toEqual(['J3', 'J4', 'J1', 'J2']);
    expect(rodadasJogadas(jogo)[0].jogadas.map((x) => x.jogador)).toEqual(['J3', 'J4', 'J1', 'J2']);
    expect(rodadasJogadas(jogo)[0].abriu).toBe('J3');
  });

  test('TC-DIS-10 (a) — carteadorInicial = J3: carteador J3 e J4 abre (R-09, D-10)', () => {
    const jogo = T.criarPartida({ carteadorInicial: 'J3', semente: 1 });
    expect(jogo.obterEstado().carteador).toBe('J3');
    esperaOk(jogo.distribuir());
    expect(jogo.obterEstado().mao.vez).toBe('J4');
  });

  test('TC-DIS-10 (b) — Sem carteador injetado, semente 7: sorteio reproduzível (R-09, D-10)', () => {
    const a = T.criarPartida({ semente: 7 });
    const b = T.criarPartida({ semente: 7 });
    expect(JOGADORES).toContain(a.obterEstado().carteador);
    expect(b.obterEstado().carteador).toBe(a.obterEstado().carteador);
    esperaOk(a.distribuir());
    esperaOk(b.distribuir());
    // mesma semente => mesma distribuição
    expect(a.obterEstado().mao.cartas).toEqual(b.obterEstado().mao.cartas);
  });

  test('TC-DIS-11 — Vez alterna entre duplas em todas as rodadas (R-01, R-02)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'B', 'A']) });
    jogarAteOFim(jogo);
    const rodadas = rodadasJogadas(jogo);
    expect(rodadas).toHaveLength(3);
    for (const r of rodadas) {
      const duplas = r.jogadas.map((x) => duplaLocal(x.jogador)).join('');
      expect(['ABAB', 'BABA']).toContain(duplas);
    }
  });
});
