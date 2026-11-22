/**
 * 6.9 Mão de onze (TC-ONZ) — R-12, R-20, R-25, R-31, R-32, R-33, R-36, D-06, D-08
 * Salvo indicação: placar 11×5, carteador J4.
 */
const { chave, conjunto } = require('../support/cartas');
const {
  prepararMao,
  maosParaResultados,
  jogarPrimeira,
  jogarAteOFim,
  rodadasJogadas,
  proximaMaoDistribuida,
  esperaOk,
  esperaRecusa,
  cartasVisiveis,
  tiposDeAcao,
} = require('../support/cenarios');

const ONZE_A = { A: 11, B: 5 };

/** TC-ONZ-01: placar 11×5, distribuir */
const onz01 = (resultados = ['A', 'B', 'A'], placar = ONZE_A) =>
  prepararMao({ placar, maos: maosParaResultados(resultados) });

/** TC-ONZ-02: TC-ONZ-01 + J1 decide JOGAR */
const onz02 = (resultados) => {
  const jogo = onz01(resultados);
  esperaOk(jogo.decidirMaoDeOnze('J1', 'JOGAR'), 'J1 decide JOGAR');
  return jogo;
};

describe('6.9 Mão de onze (TC-ONZ)', () => {
  test('TC-ONZ-01 — Ativação e visibilidade: dupla A vê as cartas do parceiro; J2 e J4 só as próprias (R-31, R-12)', () => {
    const jogo = onz01();
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_DECISAO_ONZE');
    expect(e.mao.tipo).toBe('onze');
    expect(e.mao.duplaDeOnze).toBe('A');

    const v1 = jogo.visao('J1');
    const v3 = jogo.visao('J3');
    expect(conjunto(v1.minhasCartas)).toEqual(conjunto(e.mao.cartas.J1));
    expect(conjunto(v1.cartasDoParceiro)).toEqual(conjunto(e.mao.cartas.J3));
    expect(conjunto(v3.cartasDoParceiro)).toEqual(conjunto(e.mao.cartas.J1));

    for (const j of ['J2', 'J4']) {
      const v = jogo.visao(j);
      expect(v.cartasDoParceiro == null).toBe(true);
      expect(cartasVisiveis(v)).toEqual(conjunto([...e.mao.cartas[j], e.mao.vira]));
    }
  });

  test('TC-ONZ-02 — Decidir jogar: valor 3, AGUARDANDO_JOGADA, vez de J1 (R-31)', () => {
    const jogo = onz02();
    const e = jogo.obterEstado();
    expect(e.mao.valor).toBe(3);
    expect(e.estado).toBe('AGUARDANDO_JOGADA');
    expect(e.mao.vez).toBe('J1');
  });

  test('TC-ONZ-03 — Jogar e vencer: placar 12×5 (14 limitado a 12), partida encerrada, vencedora A (R-31, R-36, D-08)', () => {
    const jogo = onz02(['A', 'A']);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 12, B: 5 });
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
    expect(e.vencedora).toBe('A');
  });

  test('TC-ONZ-04 — Jogar e perder: dupla B vence a mão => 11×8 (R-31)', () => {
    const jogo = onz02(['B', 'B']);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 11, B: 8 });
    expect(e.estado).toBe('MAO_ENCERRADA');
  });

  test('TC-ONZ-05 — Correr da mão de onze: J3 decide CORRER => 11×6, nenhuma rodada, próximo carteador J1 (R-31)', () => {
    const jogo = onz01();
    esperaOk(jogo.decidirMaoDeOnze('J3', 'CORRER'), 'J3 decide CORRER');
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 11, B: 6 });
    expect(e.estado).toBe('MAO_ENCERRADA');
    expect(e.mao.resultado).toBe('B');
    expect(rodadasJogadas(jogo)).toHaveLength(0);
    esperaOk(jogo.proximaMao());
    expect(jogo.obterEstado().carteador).toBe('J1');
  });

  test('TC-ONZ-06 — Dupla com 11 não pede truco: recusado; opção indisponível (R-32, D-06)', () => {
    const jogo = onz02();
    esperaRecusa(jogo, () => jogo.pedirAumento('J1'));
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).not.toContain('PEDIR_AUMENTO');
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).toContain('JOGAR');
  });

  test('TC-ONZ-07 — Adversária também não pede truco: J1 jogou; J2 pede truco => recusado (R-32, D-06)', () => {
    const jogo = onz02();
    jogarPrimeira(jogo);
    expect(jogo.obterEstado().mao.vez).toBe('J2');
    esperaRecusa(jogo, () => jogo.pedirAumento('J2'));
    expect(tiposDeAcao(jogo.acoesDisponiveis('J2'))).not.toContain('PEDIR_AUMENTO');
  });

  test('TC-ONZ-08 — Adversária não vê cartas do parceiro: visão de J2 = suas 3 cartas, a vira e o placar (R-12, R-31)', () => {
    const jogo = onz01();
    const e = jogo.obterEstado();
    const v = jogo.visao('J2');
    expect(conjunto(v.minhasCartas)).toEqual(conjunto(e.mao.cartas.J2));
    expect(chave(v.vira)).toBe(chave(e.mao.vira));
    expect(v.placar).toEqual({ A: 11, B: 5 });
    expect(cartasVisiveis(v)).toEqual(conjunto([...e.mao.cartas.J2, e.mao.vira]));
  });

  test('TC-ONZ-09 — Nada se joga antes da decisão (R-31, R-38)', () => {
    const jogo = onz01();
    const e = jogo.obterEstado();
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', e.mao.cartas.J1[0]));
    esperaRecusa(jogo, () => jogo.pedirAumento('J1'));
  });

  test('TC-ONZ-10 — Adversária não decide: J2 decide JOGAR => recusado; continua aguardando a dupla A (R-33)', () => {
    const jogo = onz01();
    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J2', 'JOGAR'));
    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J4', 'CORRER'));
    expect(jogo.obterEstado().estado).toBe('AGUARDANDO_DECISAO_ONZE');
    expect(tiposDeAcao(jogo.acoesDisponiveis('J2'))).not.toContain('DECIDIR_ONZE');
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).toContain('DECIDIR_ONZE');
    expect(tiposDeAcao(jogo.acoesDisponiveis('J3'))).toContain('DECIDIR_ONZE');
  });

  test('TC-ONZ-11 — Mão de onze da dupla B (placar 7×11): J2 e J4 veem as cartas um do outro; só eles decidem (R-31, R-33)', () => {
    const jogo = onz01(['A', 'B', 'A'], { A: 7, B: 11 });
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_DECISAO_ONZE');
    expect(e.mao.duplaDeOnze).toBe('B');
    expect(conjunto(jogo.visao('J2').cartasDoParceiro)).toEqual(conjunto(e.mao.cartas.J4));
    expect(conjunto(jogo.visao('J4').cartasDoParceiro)).toEqual(conjunto(e.mao.cartas.J2));
    expect(jogo.visao('J1').cartasDoParceiro == null).toBe(true);
    expect(jogo.visao('J3').cartasDoParceiro == null).toBe(true);

    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J1', 'JOGAR'));
    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J3', 'JOGAR'));
    esperaOk(jogo.decidirMaoDeOnze('J4', 'JOGAR'), 'J4 decide JOGAR');
    expect(jogo.obterEstado().mao.valor).toBe(3);
  });

  test('TC-ONZ-12 — Três empates na mão de onze: placar continua 11×5; próxima mão também é de onze (R-20, R-31)', () => {
    const jogo = onz02(['E', 'E', 'E']);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.mao.resultado).toBe('NINGUEM');
    expect(e.placar).toEqual({ A: 11, B: 5 });
    proximaMaoDistribuida(jogo);
    const e2 = jogo.obterEstado();
    expect(e2.estado).toBe('AGUARDANDO_DECISAO_ONZE');
    expect(e2.mao.tipo).toBe('onze');
    expect(e2.mao.duplaDeOnze).toBe('A');
  });

  test('TC-ONZ-13 — Mão de onze se repete: após TC-ONZ-05 (11×6), nova mão de onze para a dupla A (R-31)', () => {
    const jogo = onz01();
    esperaOk(jogo.decidirMaoDeOnze('J3', 'CORRER'));
    expect(jogo.obterEstado().placar).toEqual({ A: 11, B: 6 });
    proximaMaoDistribuida(jogo);
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_DECISAO_ONZE');
    expect(e.mao.duplaDeOnze).toBe('A');
  });

  test('TC-ONZ-14 — Chegar a 11 por corrida: 10×3, J1 pede truco, J2 corre => 11×3 e próxima mão é de onze (R-25, R-31)', () => {
    const jogo = prepararMao({ placar: { A: 10, B: 3 } });
    expect(jogo.obterEstado().mao.tipo).toBe('normal');
    esperaOk(jogo.pedirAumento('J1'));
    esperaOk(jogo.responder('J2', 'CORRER'));
    expect(jogo.obterEstado().placar).toEqual({ A: 11, B: 3 });
    proximaMaoDistribuida(jogo);
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_DECISAO_ONZE');
    expect(e.mao.tipo).toBe('onze');
    expect(e.mao.duplaDeOnze).toBe('A');
  });

  test('TC-ONZ-15 — Primeira decisão vale: J1 decide JOGAR; J3 decide CORRER => recusado; mão vale 3 e segue (R-33, D-06)', () => {
    const jogo = onz02();
    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J3', 'CORRER'));
    const e = jogo.obterEstado();
    expect(e.mao.valor).toBe(3);
    expect(e.estado).toBe('AGUARDANDO_JOGADA');
    expect(e.placar).toEqual({ A: 11, B: 5 });
  });
});
