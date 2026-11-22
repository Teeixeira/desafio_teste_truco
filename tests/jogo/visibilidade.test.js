/**
 * 6.13 Visibilidade (TC-VIS) — R-05, R-12, R-18, R-22, R-24, R-28
 * A visão de cada jogador é varrida em profundidade: qualquer {valor, naipe} conta como
 * carta visível, então nada que o jogador não deva ver pode aparecer em lugar nenhum.
 */
const { JOGADORES, chave, conjunto } = require('../support/cartas');
const {
  prepararMao,
  maosParaResultados,
  jogar,
  jogarRodadas,
  jogarAteOFim,
  esperaOk,
  cartasVisiveis,
  tiposDeAcao,
  acao,
} = require('../support/cenarios');

describe('6.13 Visibilidade (TC-VIS)', () => {
  test('TC-VIS-01 — Cartas próprias são privadas: cada um vê só as próprias 3; das outras, a quantidade (R-12)', () => {
    const jogo = prepararMao();
    const e = jogo.obterEstado();
    for (const j of JOGADORES) {
      const v = jogo.visao(j);
      expect(v.jogador).toBe(j);
      expect(conjunto(v.minhasCartas)).toEqual(conjunto(e.mao.cartas[j]));
      expect(v.cartasDoParceiro == null).toBe(true);
      expect(v.quantidadeCartas).toEqual({ J1: 3, J2: 3, J3: 3, J4: 3 });
      expect(cartasVisiveis(v)).toEqual(conjunto([...e.mao.cartas[j], e.mao.vira]));
    }
  });

  test('TC-VIS-02 — Vira é pública: todos veem a vira e a manilha da mão (R-05, R-12)', () => {
    const jogo = prepararMao({ vira: '4♥' });
    for (const j of JOGADORES) {
      const v = jogo.visao(j);
      expect(chave(v.vira)).toBe('4♥');
      expect(v.manilha).toBe('5');
    }
  });

  test('TC-VIS-03 — Mesa é pública: J3 vê 7♦ de J1 e uma carta virada de J2 (2ª rodada) (R-12, R-18)', () => {
    const jogo = prepararMao({
      maos: {
        J1: ['3♦', '7♦', 'Q♦'],
        J2: ['4♠', 'K♣', 'J♠'],
        J3: ['6♦', '6♠', 'K♦'],
        J4: ['7♠', '4♦', 'Q♣'],
      },
    });
    jogar(jogo, 'J1 3♦, J2 4♠, J3 6♦, J4 7♠'); // A (J1)
    jogar(jogo, 'J1 7♦, J2 K♣ coberta');

    const v = jogo.visao('J3');
    const visiveis = cartasVisiveis(v);
    expect(visiveis).toContain('7♦');
    expect(visiveis).not.toContain('K♣');
    const r2 = v.rodadas.filter((r) => r.jogadas && r.jogadas.length > 0)[1];
    expect(r2.jogadas[0]).toMatchObject({ jogador: 'J1', coberta: false });
    expect(chave(r2.jogadas[0].carta)).toBe('7♦');
    expect(r2.jogadas[1]).toMatchObject({ jogador: 'J2', coberta: true });
    expect(r2.jogadas[1].carta == null).toBe(true);
  });

  test('TC-VIS-04 — Informações públicas: placar, valor, vez, resultado de cada rodada e quem pediu qual valor (R-12)', () => {
    const jogo = prepararMao({ placar: { A: 2, B: 5 }, maos: maosParaResultados(['B', 'A', 'B']) });
    jogarRodadas(jogo, 1); // 1ª = B (J2)
    esperaOk(jogo.pedirAumento('J2'));

    for (const j of JOGADORES) {
      const v = jogo.visao(j);
      expect(v.estado).toBe('AGUARDANDO_RESPOSTA');
      expect(v.placar).toEqual({ A: 2, B: 5 });
      expect(v.valor).toBe(1);
      expect(v.vez).toBe('J2');
      const resultados = v.rodadas.filter((r) => r.resultado != null).map((r) => r.resultado);
      expect(resultados).toEqual(['B']);
      expect(v.pedidoPendente).toMatchObject({ dupla: 'B', jogador: 'J2', valorProposto: 3 });
    }
  });

  test('TC-VIS-05 (a) — Vez de J1: só J1 tem "Jogar" e "Truco" (R-22, R-28)', () => {
    const jogo = prepararMao();
    const a1 = jogo.acoesDisponiveis('J1');
    expect(tiposDeAcao(a1)).toEqual(['JOGAR', 'PEDIR_AUMENTO']);
    expect(acao(a1, 'PEDIR_AUMENTO').rotulo).toBe('Truco');
    for (const j of ['J2', 'J3', 'J4']) expect(jogo.acoesDisponiveis(j)).toEqual([]);
  });

  test('TC-VIS-05 (b) — J1 pediu truco: só J2 e J4 têm "Aceitar", "Correr" e "Seis" (R-22, R-28)', () => {
    const jogo = prepararMao();
    esperaOk(jogo.pedirAumento('J1'));
    for (const j of ['J2', 'J4']) {
      const a = jogo.acoesDisponiveis(j);
      expect(tiposDeAcao(a)).toEqual(['ACEITAR', 'AUMENTAR', 'CORRER']);
      expect(acao(a, 'AUMENTAR').rotulo).toBe('Seis');
    }
    for (const j of ['J1', 'J3']) expect(jogo.acoesDisponiveis(j)).toEqual([]);
  });

  test('TC-VIS-06 — Cartas não jogadas continuam secretas após a mão (A, A) (R-12)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.estado).toBe('MAO_ENCERRADA');
    const v2 = jogo.visao('J2');
    const visiveis = cartasVisiveis(v2);
    for (const j of ['J1', 'J3', 'J4']) {
      for (const carta of e.mao.cartas[j]) expect(visiveis).not.toContain(chave(carta));
    }
  });

  test('TC-VIS-07 — Sem "Aumentar" diante do doze: a dupla que responde tem apenas "Aceitar" e "Correr" (R-24)', () => {
    const jogo = prepararMao();
    esperaOk(jogo.pedirAumento('J1')); // truco
    esperaOk(jogo.responder('J2', 'AUMENTAR')); // seis
    esperaOk(jogo.responder('J3', 'AUMENTAR')); // nove
    esperaOk(jogo.responder('J4', 'AUMENTAR')); // doze (B)
    expect(jogo.obterEstado().mao.pedidoPendente).toMatchObject({ dupla: 'B', valorProposto: 12 });
    for (const j of ['J1', 'J3']) {
      expect(tiposDeAcao(jogo.acoesDisponiveis(j))).toEqual(['ACEITAR', 'CORRER']);
    }
  });
});
