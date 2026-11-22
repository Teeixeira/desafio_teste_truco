/**
 * 6.14 Cenários ponta a ponta (TC-E2E)
 * Cada cenário fixa o baralho (D-10) e roteiriza a mão carta a carta.
 * O teste passa se cada passo produzir exatamente o resultado indicado.
 */
const { JOGADORES, chave, conjunto } = require('../support/cartas');
const {
  prepararMao,
  jogar,
  jogarPrimeira,
  rodadasJogadas,
  resultadosRodadas,
  cartasEmJogo,
  cartasVisiveis,
  esperaOk,
  esperaRecusa,
} = require('../support/cenarios');

const mao = (jogo) => jogo.obterEstado().mao;
const ultimaRodada = (jogo) => rodadasJogadas(jogo).slice(-1)[0];

describe('6.14 Cenários ponta a ponta (TC-E2E)', () => {
  test('TC-E2E-01 — Mão sem truco decidida após empate (R-11, R-14, R-15, R-17, R-19, R-20, R-09)', () => {
    // Dado: placar 0×0; carteador J4; vira 4♥ (manilha 5)
    const jogo = prepararMao({
      carteador: 'J4',
      vira: '4♥',
      maos: {
        J1: ['3♦', '7♠', '5♠'],
        J2: ['2♣', 'K♦', 'Q♥'],
        J3: ['A♠', '6♦', '4♣'],
        J4: ['3♣', 'J♦', '5♦'],
      },
    });

    // 1. Distribuir => vez de J1
    expect(mao(jogo).vez).toBe('J1');
    expect(mao(jogo).manilha).toBe('5');

    // 2. J1 3♦, J2 2♣, J3 A♠, J4 3♣ => 1ª = E (3♦ de A e 3♣ de B); J1 abre a 2ª
    jogar(jogo, 'J1 3♦, J2 2♣, J3 A♠, J4 3♣');
    expect(ultimaRodada(jogo).resultado).toBe('E');
    expect(mao(jogo).vez).toBe('J1');

    // 3. J1 5♠, J2 K♦, J3 6♦, J4 5♦ => 2ª = A (espadilha vence pica-fumo)
    jogar(jogo, 'J1 5♠, J2 K♦, J3 6♦, J4 5♦');
    expect(ultimaRodada(jogo).resultado).toBe('A');
    expect(ultimaRodada(jogo).vencedor).toBe('J1');

    // 4. Mão: E, A => A vence; 3ª não é jogada; placar 1×0
    const e = jogo.obterEstado();
    expect(resultadosRodadas(jogo)).toEqual(['E', 'A']);
    expect(e.mao.resultado).toBe('A');
    expect(e.estado).toBe('MAO_ENCERRADA');
    expect(e.placar).toEqual({ A: 1, B: 0 });

    // 5. Iniciar próxima mão => carteador J1; J2 abre
    esperaOk(jogo.proximaMao());
    esperaOk(jogo.distribuir());
    expect(jogo.obterEstado().carteador).toBe('J1');
    expect(mao(jogo).vez).toBe('J2');
  });

  test('TC-E2E-02 — Truco, seis e virada na 3ª rodada (R-16, R-22, R-23, R-24, R-26, R-07, R-19)', () => {
    // Dado: placar 1×0; carteador J1; vira 7♣ (manilha Q)
    const jogo = prepararMao({
      placar: { A: 1, B: 0 },
      carteador: 'J1',
      vira: '7♣',
      maos: {
        J2: ['Q♦', '3♠', '4♥'],
        J3: ['K♣', '2♦', '5♠'],
        J4: ['Q♣', '6♥', '7♦'],
        J1: ['A♥', 'J♠', '3♥'],
      },
    });

    // 1. Distribuir => vez de J2
    expect(mao(jogo).vez).toBe('J2');
    expect(mao(jogo).manilha).toBe('Q');

    // 2. J2 3♠, J3 K♣, J4 7♦, J1 A♥ => 1ª = B (vencedor J2); J2 abre a 2ª
    jogar(jogo, 'J2 3♠, J3 K♣, J4 7♦, J1 A♥');
    expect(ultimaRodada(jogo)).toMatchObject({ resultado: 'B', vencedor: 'J2' });
    expect(mao(jogo).vez).toBe('J2');

    // 3. J2 pede truco => aguardando dupla A; proposto 3
    esperaOk(jogo.pedirAumento('J2'));
    expect(jogo.obterEstado().estado).toBe('AGUARDANDO_RESPOSTA');
    expect(mao(jogo).pedidoPendente).toMatchObject({ dupla: 'B', valorProposto: 3 });

    // 4. J3 responde AUMENTAR => valor 3; proposto 6; aguardando dupla B
    esperaOk(jogo.responder('J3', 'AUMENTAR'));
    expect(mao(jogo).valor).toBe(3);
    expect(mao(jogo).pedidoPendente).toMatchObject({ dupla: 'A', jogador: 'J3', valorProposto: 6 });

    // 5. J4 aceita => valor 6; direito de aumentar = B; vez de J2
    esperaOk(jogo.responder('J4', 'ACEITAR'));
    expect(mao(jogo).valor).toBe(6);
    expect(mao(jogo).direitoDeAumentar).toBe('B');
    expect(mao(jogo).vez).toBe('J2');

    // 6. J2 4♥, J3 2♦, J4 6♥, J1 J♠ => 2ª = A (vencedor J3); J3 abre a 3ª
    jogar(jogo, 'J2 4♥, J3 2♦, J4 6♥, J1 J♠');
    expect(ultimaRodada(jogo)).toMatchObject({ resultado: 'A', vencedor: 'J3' });
    expect(mao(jogo).vez).toBe('J3');

    // 7. J3 5♠, J4 Q♣ => jogadas aceitas; vez de J1
    jogar(jogo, 'J3 5♠, J4 Q♣');
    expect(mao(jogo).vez).toBe('J1');

    // 8. J1 pede nove => recusado: o direito de aumentar é da dupla B
    esperaRecusa(jogo, () => jogo.pedirAumento('J1'));

    // 9. J1 3♥, J2 Q♦ => 3ª = B (zap vence pica-fumo)
    jogar(jogo, 'J1 3♥, J2 Q♦');
    expect(ultimaRodada(jogo)).toMatchObject({ resultado: 'B', vencedor: 'J4' });

    // 10. Mão: B, A, B => B vence; placar 1×6; próximo carteador J2
    const e = jogo.obterEstado();
    expect(resultadosRodadas(jogo)).toEqual(['B', 'A', 'B']);
    expect(e.mao.resultado).toBe('B');
    expect(e.placar).toEqual({ A: 1, B: 6 });
    esperaOk(jogo.proximaMao());
    expect(jogo.obterEstado().carteador).toBe('J2');
  });

  test('TC-E2E-03 — Mão de onze que decide a partida (R-31, R-32, R-17, R-20, R-36)', () => {
    // Dado: placar 11×8; carteador J2; vira K♠ (manilha A)
    const jogo = prepararMao({
      placar: { A: 11, B: 8 },
      carteador: 'J2',
      vira: 'K♠',
      maos: {
        J3: ['A♣', '3♦', '4♠'],
        J4: ['2♥', 'A♦', '5♣'],
        J1: ['A♥', '7♠', 'Q♦'],
        J2: ['3♣', 'J♥', '6♦'],
      },
    });

    // 1. Distribuir => AGUARDANDO_DECISAO_ONZE; J1 vê as cartas de J3 e J3 vê as de J1
    const e1 = jogo.obterEstado();
    expect(e1.estado).toBe('AGUARDANDO_DECISAO_ONZE');
    expect(conjunto(jogo.visao('J1').cartasDoParceiro)).toEqual(conjunto(e1.mao.cartas.J3));
    expect(conjunto(jogo.visao('J3').cartasDoParceiro)).toEqual(conjunto(e1.mao.cartas.J1));

    // 2. J3 decide JOGAR => valor 3; vez de J3
    esperaOk(jogo.decidirMaoDeOnze('J3', 'JOGAR'));
    expect(mao(jogo).valor).toBe(3);
    expect(mao(jogo).vez).toBe('J3');

    // 3. J3 3♦, J4 2♥, J1 7♠, J2 3♣ => 1ª = E; J3 abre a 2ª
    jogar(jogo, 'J3 3♦, J4 2♥, J1 7♠, J2 3♣');
    expect(ultimaRodada(jogo).resultado).toBe('E');
    expect(mao(jogo).vez).toBe('J3');

    // 4. J3 A♣ => jogada aceita; vez de J4
    jogar(jogo, 'J3 A♣');
    expect(mao(jogo).vez).toBe('J4');

    // 5. J4 pede truco => recusado: não há truco na mão de onze
    esperaRecusa(jogo, () => jogo.pedirAumento('J4'));

    // 6. J4 A♦, J1 Q♦, J2 J♥ => 2ª = A (zap)
    jogar(jogo, 'J4 A♦, J1 Q♦, J2 J♥');
    expect(ultimaRodada(jogo)).toMatchObject({ resultado: 'A', vencedor: 'J3' });

    // 7. Mão: E, A => A vence; placar 12×8; partida encerrada; vencedora A
    const e = jogo.obterEstado();
    expect(resultadosRodadas(jogo)).toEqual(['E', 'A']);
    expect(e.placar).toEqual({ A: 12, B: 8 });
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
    expect(e.vencedora).toBe('A');
  });

  test('TC-E2E-04 — Corrida antes de qualquer carta (R-22, R-25, R-30, R-09)', () => {
    // Dado: placar 3×3; carteador J3; vira 6♣ (manilha 7); cartas quaisquer
    const jogo = prepararMao({ placar: { A: 3, B: 3 }, carteador: 'J3', vira: '6♣' });

    // 1. Distribuir => vez de J4
    expect(mao(jogo).vez).toBe('J4');
    expect(mao(jogo).manilha).toBe('7');

    // 2. J4 pede truco => aguardando dupla A
    esperaOk(jogo.pedirAumento('J4'));
    expect(mao(jogo).pedidoPendente).toMatchObject({ dupla: 'B', jogador: 'J4', valorProposto: 3 });

    // 3. J1 corre => placar 3×4; mão encerrada sem cartas jogadas
    esperaOk(jogo.responder('J1', 'CORRER'));
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 3, B: 4 });
    expect(e.estado).toBe('MAO_ENCERRADA');
    expect(rodadasJogadas(jogo)).toHaveLength(0);

    // 4. Iniciar próxima mão => carteador J4; J1 abre; 40 cartas embaralhadas de novo
    esperaOk(jogo.proximaMao());
    const pre = jogo.obterEstado();
    expect(pre.carteador).toBe('J4');
    expect(pre.monte).toHaveLength(40);
    esperaOk(jogo.distribuir());
    const pos = jogo.obterEstado();
    expect(pos.mao.vez).toBe('J1');
    const todas = cartasEmJogo(pos).map(chave);
    expect(new Set(todas).size).toBe(40);
  });

  test('TC-E2E-05 — Mão de ferro (R-34, R-07, R-16, R-19, R-36)', () => {
    // Dado: placar 11×11; carteador J4; vira 6♦ (manilha 7); todos escolhem a 1ª carta oculta
    const jogo = prepararMao({
      placar: { A: 11, B: 11 },
      carteador: 'J4',
      vira: '6♦',
      maos: {
        J1: ['K♠', 'Q♠', 'J♣'],
        J2: ['7♥', '4♣', '2♠'],
        J3: ['3♣', '7♣', '5♦'],
        J4: ['2♦', 'A♥', '6♠'],
      },
    });

    // 1. Distribuir => ninguém vê as próprias cartas; vira visível; vez de J1
    expect(mao(jogo).tipo).toBe('ferro');
    expect(mao(jogo).vez).toBe('J1');
    for (const j of JOGADORES) expect(cartasVisiveis(jogo.visao(j))).toEqual(['6♦']);

    const reveladas = () => ultimaRodada(jogo).jogadas.map((x) => chave(x.carta));

    // 2. J1, J2, J3, J4 jogam => K♠, 7♥, 3♣, 2♦; 1ª = B (vencedor J2)
    expect([0, 1, 2, 3].map(() => jogarPrimeira(jogo))).toEqual(['J1', 'J2', 'J3', 'J4']);
    expect(reveladas()).toEqual(['K♠', '7♥', '3♣', '2♦']);
    expect(ultimaRodada(jogo)).toMatchObject({ resultado: 'B', vencedor: 'J2' });

    // 3. J2, J3, J4, J1 jogam => 4♣, 7♣, A♥, Q♠; 2ª = A (zap, vencedor J3)
    expect([0, 1, 2, 3].map(() => jogarPrimeira(jogo))).toEqual(['J2', 'J3', 'J4', 'J1']);
    expect(reveladas()).toEqual(['4♣', '7♣', 'A♥', 'Q♠']);
    expect(ultimaRodada(jogo)).toMatchObject({ resultado: 'A', vencedor: 'J3' });

    // 4. J3, J4, J1, J2 jogam => 5♦, 6♠, J♣, 2♠; 3ª = B (vencedor J2)
    expect([0, 1, 2, 3].map(() => jogarPrimeira(jogo))).toEqual(['J3', 'J4', 'J1', 'J2']);
    expect(reveladas()).toEqual(['5♦', '6♠', 'J♣', '2♠']);
    expect(ultimaRodada(jogo)).toMatchObject({ resultado: 'B', vencedor: 'J2' });

    // 5. Mão: B, A, B => B vence; placar 11×12; vencedora B
    const e = jogo.obterEstado();
    expect(resultadosRodadas(jogo)).toEqual(['B', 'A', 'B']);
    expect(e.placar).toEqual({ A: 11, B: 12 });
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
    expect(e.vencedora).toBe('B');
  });
});
