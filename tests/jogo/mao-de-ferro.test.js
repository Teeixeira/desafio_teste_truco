/**
 * 6.10 Mão de ferro (TC-FER) — R-20, R-31, R-34, R-36, D-07, D-08
 * Salvo indicação: placar 11×11, carteador J4.
 */
const { JOGADORES, chave } = require('../support/cartas');
const {
  prepararMao,
  maosParaResultados,
  jogarAteOFim,
  rodadasJogadas,
  resultadosRodadas,
  proximaMaoDistribuida,
  esperaOk,
  esperaRecusa,
  cartasVisiveis,
  tiposDeAcao,
} = require('../support/cenarios');

const FERRO = { A: 11, B: 11 };
const fer01 = (resultados = ['A', 'B', 'A']) =>
  prepararMao({ placar: FERRO, maos: maosParaResultados(resultados) });

describe('6.10 Mão de ferro (TC-FER)', () => {
  test('TC-FER-01 — Ativação e cartas ocultas: ninguém vê as próprias cartas nem as do parceiro; vira visível; vez de J1 (R-34, D-07)', () => {
    const jogo = fer01();
    const e = jogo.obterEstado();
    expect(e.mao.tipo).toBe('ferro');
    expect(e.estado).toBe('AGUARDANDO_JOGADA');
    expect(e.mao.vez).toBe('J1');
    expect(e.mao.valor).toBe(1);

    for (const j of JOGADORES) {
      const v = jogo.visao(j);
      expect(v.minhasCartas).toHaveLength(3);
      expect(v.minhasCartas.every((x) => x == null)).toBe(true);
      expect(v.cartasDoParceiro == null).toBe(true);
      expect(chave(v.vira)).toBe(chave(e.mao.vira));
      expect(cartasVisiveis(v)).toEqual([chave(e.mao.vira)]);
      expect(v.quantidadeCartas).toEqual({ J1: 3, J2: 3, J3: 3, J4: 3 });
    }
  });

  test('TC-FER-02 — Jogar às cegas: J1 escolhe a carta da posição 2; ela é revelada a todos; J1 fica com 2 ocultas (R-34)', () => {
    const jogo = fer01();
    const segunda = jogo.obterEstado().mao.cartas.J1[1];
    esperaOk(jogo.jogarCarta('J1', 1), 'J1 joga a carta da posição 2 (índice 1)');

    const jogada = rodadasJogadas(jogo)[0].jogadas[0];
    expect(jogada.jogador).toBe('J1');
    expect(chave(jogada.carta)).toBe(chave(segunda));
    expect(jogada.coberta).toBe(false);

    for (const j of JOGADORES) expect(cartasVisiveis(jogo.visao(j))).toContain(chave(segunda));
    const v1 = jogo.visao('J1');
    expect(v1.minhasCartas).toHaveLength(2);
    expect(v1.minhasCartas.every((x) => x == null)).toBe(true);
  });

  test('TC-FER-03 — Sem truco: J1 pede truco => recusado (R-34)', () => {
    const jogo = fer01();
    esperaRecusa(jogo, () => jogo.pedirAumento('J1'));
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).toEqual(['JOGAR']);
  });

  test('TC-FER-04 — Sem opção de correr: J1 tenta decidir CORRER => recusado; não existe etapa de decisão (R-34)', () => {
    const jogo = fer01();
    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J1', 'CORRER'));
    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J2', 'CORRER'));
    for (const j of JOGADORES) {
      expect(tiposDeAcao(jogo.acoesDisponiveis(j))).not.toContain('DECIDIR_ONZE');
    }
  });

  test('TC-FER-05 — Vencedor leva a partida: rodadas A, A => 12×11, vencedora A (R-34, R-36)', () => {
    const jogo = fer01(['A', 'A']);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(resultadosRodadas(jogo)).toEqual(['A', 'A']);
    expect(e.placar).toEqual({ A: 12, B: 11 });
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
    expect(e.vencedora).toBe('A');
  });

  test('TC-FER-06 — Três empates redistribuem: 11×11, carteador J1, nova mão de ferro (R-34, D-07)', () => {
    const jogo = fer01(['E', 'E', 'E']);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.mao.resultado).toBe('NINGUEM');
    expect(e.placar).toEqual({ A: 11, B: 11 });
    expect(e.estado).toBe('MAO_ENCERRADA');

    proximaMaoDistribuida(jogo);
    const e2 = jogo.obterEstado();
    expect(e2.carteador).toBe('J1');
    expect(e2.mao.tipo).toBe('ferro');
    expect(e2.estado).toBe('AGUARDANDO_JOGADA');
  });

  test('TC-FER-07 — Regras de empate valem normalmente: E, B => 11×12, vencedora B (R-20, R-34)', () => {
    const jogo = fer01(['E', 'B']);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(resultadosRodadas(jogo)).toEqual(['E', 'B']);
    expect(e.placar).toEqual({ A: 11, B: 12 });
    expect(e.vencedora).toBe('B');
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
  });

  test('TC-FER-08 — Chegar a 11×11: mão de onze da dupla A em 11×10, J1 corre => próxima mão é mão de ferro (R-31, R-34)', () => {
    const jogo = prepararMao({ placar: { A: 11, B: 10 } });
    expect(jogo.obterEstado().mao.tipo).toBe('onze');
    esperaOk(jogo.decidirMaoDeOnze('J1', 'CORRER'));
    expect(jogo.obterEstado().placar).toEqual({ A: 11, B: 11 });
    proximaMaoDistribuida(jogo);
    const e = jogo.obterEstado();
    expect(e.mao.tipo).toBe('ferro');
    expect(e.estado).toBe('AGUARDANDO_JOGADA');
  });

  test('TC-FER-09 — Perder a mão de onze não gera mão de ferro: 11×10, A joga, B vence => 11×12 (13 limitado), vencedora B (R-31, R-36, D-08)', () => {
    const jogo = prepararMao({ placar: { A: 11, B: 10 }, maos: maosParaResultados(['B', 'B']) });
    esperaOk(jogo.decidirMaoDeOnze('J1', 'JOGAR'));
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 11, B: 12 });
    expect(e.vencedora).toBe('B');
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
  });
});
