/**
 * 6.6 Resultado da mão (TC-MAO) — R-09, R-13, R-19, R-20, R-21, R-35, D-04
 * Cobre as 15 sequências possíveis de resultados de rodadas.
 * Todos partem de placar 0×0, carteador J4 e mão valendo 1, salvo indicação.
 */
const {
  prepararMao,
  maosParaResultados,
  jogarAteOFim,
  resultadosRodadas,
  esperaOk,
  esperaRecusa,
} = require('../support/cenarios');

const SEQUENCIAS = [
  ['TC-MAO-01', 'A vence as duas primeiras', ['A', 'A'], 'A'],
  ['TC-MAO-02', 'B vence as duas primeiras', ['B', 'B'], 'B'],
  ['TC-MAO-03', 'Vitória de A na 3ª', ['A', 'B', 'A'], 'A'],
  ['TC-MAO-04', 'Virada de B na 3ª', ['A', 'B', 'B'], 'B'],
  ['TC-MAO-05', 'Virada de A na 3ª', ['B', 'A', 'A'], 'A'],
  ['TC-MAO-06', 'Vitória de B na 3ª', ['B', 'A', 'B'], 'B'],
  ['TC-MAO-07', 'A vence a 1ª e a 2ª empata', ['A', 'E'], 'A'],
  ['TC-MAO-08', 'B vence a 1ª e a 2ª empata', ['B', 'E'], 'B'],
  ['TC-MAO-09', '1ª empata e A vence a 2ª', ['E', 'A'], 'A'],
  ['TC-MAO-10', '1ª empata e B vence a 2ª', ['E', 'B'], 'B'],
  ['TC-MAO-11', 'Duas empatadas, A vence a 3ª', ['E', 'E', 'A'], 'A'],
  ['TC-MAO-12', 'Duas empatadas, B vence a 3ª', ['E', 'E', 'B'], 'B'],
  ['TC-MAO-14', '3ª empata: vale a 1ª (A)', ['A', 'B', 'E'], 'A'],
  ['TC-MAO-15', '3ª empata: vale a 1ª (B)', ['B', 'A', 'E'], 'B'],
];

const placarDe = (vencedor, valor) =>
  vencedor === 'A' ? { A: valor, B: 0 } : vencedor === 'B' ? { A: 0, B: valor } : { A: 0, B: 0 };

describe('6.6 Resultado da mão (TC-MAO)', () => {
  test.each(SEQUENCIAS)('%s — %s: rodadas %p => %s vence (R-19, R-20)', (_id, _nome, rodadas, vencedor) => {
    const jogo = prepararMao({ maos: maosParaResultados(rodadas) });
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();

    expect(resultadosRodadas(jogo)).toEqual(rodadas);
    expect(e.estado).toBe('MAO_ENCERRADA');
    expect(e.mao.resultado).toBe(vencedor);
    expect(e.placar).toEqual(placarDe(vencedor, 1));

    if (rodadas.length === 2) {
      // a 3ª rodada não é jogada: cada jogador ainda tem 1 carta e não pode jogá-la
      for (const j of ['J1', 'J2', 'J3', 'J4']) expect(e.mao.cartas[j]).toHaveLength(1);
      esperaRecusa(jogo, () => jogo.jogarCarta('J1', e.mao.cartas.J1[0]));
    }
  });

  test('TC-MAO-13 — Três empates: ninguém pontua; próxima mão com carteador J1 (R-20, R-09, D-04)', () => {
    const jogo = prepararMao({ carteador: 'J4', maos: maosParaResultados(['E', 'E', 'E']) });
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(resultadosRodadas(jogo)).toEqual(['E', 'E', 'E']);
    expect(e.estado).toBe('MAO_ENCERRADA');
    expect(e.mao.resultado).toBe('NINGUEM');
    expect(e.placar).toEqual({ A: 0, B: 0 });

    esperaOk(jogo.proximaMao());
    expect(jogo.obterEstado().carteador).toBe('J1');
  });

  test('TC-MAO-16 — Valor do truco é aplicado: truco aceito, rodadas A, A => placar 3×0 (R-21, R-35)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    esperaOk(jogo.pedirAumento('J1'), 'J1 pede truco');
    esperaOk(jogo.responder('J2', 'ACEITAR'), 'J2 aceita');
    expect(jogo.obterEstado().mao.valor).toBe(3);
    jogarAteOFim(jogo);
    expect(jogo.obterEstado().placar).toEqual({ A: 3, B: 0 });
  });

  test('TC-MAO-17 — Três empates com aposta alta (seis aceito): ninguém pontua (R-20, D-04)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['E', 'E', 'E']) });
    esperaOk(jogo.pedirAumento('J1'), 'J1 pede truco');
    esperaOk(jogo.responder('J2', 'AUMENTAR'), 'J2 pede seis');
    esperaOk(jogo.responder('J1', 'ACEITAR'), 'J1 aceita o seis');
    expect(jogo.obterEstado().mao.valor).toBe(6);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.mao.resultado).toBe('NINGUEM');
    expect(e.placar).toEqual({ A: 0, B: 0 });
  });

  test('R-13 — Uma mão tem no máximo 3 rodadas', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['E', 'E', 'E']) });
    jogarAteOFim(jogo);
    expect(resultadosRodadas(jogo)).toHaveLength(3);
    for (const j of ['J1', 'J2', 'J3', 'J4']) expect(jogo.obterEstado().mao.cartas[j]).toHaveLength(0);
  });
});
