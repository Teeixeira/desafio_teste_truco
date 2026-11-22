/**
 * 6.8 Truco e aumentos (TC-TRU) — R-22 a R-30, R-35, R-36, R-38, D-05
 * Salvo indicação: estado padrão, 1ª rodada, vez de J1, valor 1, qualquer dupla pode pedir.
 */
const T = require('../support/impl');
const {
  prepararMao,
  maosParaResultados,
  jogar,
  jogarPrimeira,
  jogarAteOFim,
  rodadasJogadas,
  esperaOk,
  esperaRecusa,
  tiposDeAcao,
  acao,
} = require('../support/cenarios');

const pedir = (jogo, j) => esperaOk(jogo.pedirAumento(j), `${j} pede aumento`);
const resp = (jogo, j, r) => esperaOk(jogo.responder(j, r), `${j} responde ${r}`);
const mao = (jogo) => jogo.obterEstado().mao;

/** TC-TRU-01: estado padrão + J1 pede truco */
function tru01(maos = maosParaResultados(['A', 'B', 'A'])) {
  const jogo = prepararMao({ maos });
  pedir(jogo, 'J1');
  return jogo;
}

/** TC-TRU-04: TC-TRU-01 + J2 aumenta (seis) */
function tru04(maos) {
  const jogo = tru01(maos);
  resp(jogo, 'J2', 'AUMENTAR');
  return jogo;
}

/** Doze pedido pela dupla B, pendente */
function dozePendente() {
  const jogo = tru04();
  resp(jogo, 'J3', 'AUMENTAR'); // nove (A)
  resp(jogo, 'J2', 'AUMENTAR'); // doze (B)
  return jogo;
}

describe('6.8 Truco e aumentos (TC-TRU)', () => {
  test('TC-TRU-01 — Pedir truco: AGUARDANDO_RESPOSTA, vigente 1, proposto 3, pedido da dupla A (R-22)', () => {
    const jogo = tru01();
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_RESPOSTA');
    expect(e.mao.valor).toBe(1);
    expect(e.mao.pedidoPendente).toMatchObject({ dupla: 'A', jogador: 'J1', valorProposto: 3 });
  });

  test('TC-TRU-02 — Aceitar truco: valor 3, vez continua com J1, direito de aumentar = B (R-22, R-23, R-26)', () => {
    const jogo = tru01();
    resp(jogo, 'J2', 'ACEITAR');
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_JOGADA');
    expect(e.mao.valor).toBe(3);
    expect(e.mao.vez).toBe('J1');
    expect(e.mao.direitoDeAumentar).toBe('B');
    expect(e.mao.pedidoPendente).toBeNull();
    // pedir não consumiu a vez: J1 ainda tem 3 cartas e é quem joga
    expect(e.mao.cartas.J1).toHaveLength(3);
  });

  test('TC-TRU-03 — Correr do truco: A ganha 1, mão encerrada sem jogadas, próxima mão com carteador J1 (R-25, R-30)', () => {
    const jogo = tru01();
    resp(jogo, 'J2', 'CORRER');
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 1, B: 0 });
    expect(e.estado).toBe('MAO_ENCERRADA');
    expect(e.mao.resultado).toBe('A');
    expect(rodadasJogadas(jogo)).toHaveLength(0);
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', e.mao.cartas.J1[0]));

    esperaOk(jogo.proximaMao());
    expect(jogo.obterEstado().carteador).toBe('J1');
  });

  test('TC-TRU-04 — Responder com seis: vigente 3 (truco aceito), proposto 6, aguarda dupla A (R-23, R-24)', () => {
    const jogo = tru04();
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_RESPOSTA');
    expect(e.mao.valor).toBe(3);
    expect(e.mao.pedidoPendente).toMatchObject({ dupla: 'B', jogador: 'J2', valorProposto: 6 });
    // quem responde agora é a dupla A
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).toEqual(expect.arrayContaining(['ACEITAR', 'CORRER']));
    expect(tiposDeAcao(jogo.acoesDisponiveis('J2'))).toEqual([]);
  });

  test('TC-TRU-05 — Aceitar o seis: valor 6, direito de aumentar = A, vez de J1 (R-24, R-26)', () => {
    const jogo = tru04();
    resp(jogo, 'J3', 'ACEITAR');
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_JOGADA');
    expect(e.mao.valor).toBe(6);
    expect(e.mao.direitoDeAumentar).toBe('A');
    expect(e.mao.vez).toBe('J1');
  });

  test('TC-TRU-06 — Correr do seis: B ganha 3 (placar 0×3) (R-25)', () => {
    const jogo = tru04();
    resp(jogo, 'J3', 'CORRER');
    expect(jogo.obterEstado().placar).toEqual({ A: 0, B: 3 });
    expect(jogo.obterEstado().mao.resultado).toBe('B');
  });

  test('TC-TRU-07 — Correr do nove: J3 aumenta (nove); J4 corre => A ganha 6 (R-24, R-25)', () => {
    const jogo = tru04();
    resp(jogo, 'J3', 'AUMENTAR');
    const e = jogo.obterEstado();
    expect(e.mao.valor).toBe(6);
    expect(e.mao.pedidoPendente).toMatchObject({ dupla: 'A', valorProposto: 9 });
    resp(jogo, 'J4', 'CORRER');
    expect(jogo.obterEstado().placar).toEqual({ A: 6, B: 0 });
  });

  test('TC-TRU-08 — Correr do doze: nove de A pendente; J2 aumenta (doze); J1 corre => B ganha 9 (R-24, R-25)', () => {
    const jogo = tru04();
    resp(jogo, 'J3', 'AUMENTAR'); // nove pendente, pedido pela dupla A
    resp(jogo, 'J2', 'AUMENTAR'); // doze
    const e = jogo.obterEstado();
    expect(e.mao.valor).toBe(9);
    expect(e.mao.pedidoPendente).toMatchObject({ dupla: 'B', valorProposto: 12 });
    resp(jogo, 'J1', 'CORRER');
    expect(jogo.obterEstado().placar).toEqual({ A: 0, B: 9 });
  });

  test('TC-TRU-09 — Aceitar o doze: valor 12; nenhum jogador tem a opção de aumentar (R-24)', () => {
    const jogo = dozePendente();
    resp(jogo, 'J3', 'ACEITAR');
    const e = jogo.obterEstado();
    expect(e.mao.valor).toBe(12);
    expect(e.estado).toBe('AGUARDANDO_JOGADA');
    for (const j of ['J1', 'J2', 'J3', 'J4']) {
      const tipos = tiposDeAcao(jogo.acoesDisponiveis(j));
      expect(tipos).not.toContain('PEDIR_AUMENTO');
      expect(tipos).not.toContain('AUMENTAR');
    }
  });

  test('TC-TRU-10 (a) — Não existe aumento além de 12: jogador da vez pede aumento com valor 12 (R-24, R-38)', () => {
    const jogo = dozePendente();
    resp(jogo, 'J3', 'ACEITAR');
    expect(mao(jogo).vez).toBe('J1');
    esperaRecusa(jogo, () => jogo.pedirAumento('J1'));
    jogarPrimeira(jogo);
    esperaRecusa(jogo, () => jogo.pedirAumento('J2'));
  });

  test('TC-TRU-10 (b) — Não existe aumento além de 12: adversário responde AUMENTAR ao doze (R-24, R-38)', () => {
    const jogo = dozePendente();
    esperaRecusa(jogo, () => jogo.responder('J1', 'AUMENTAR'));
    esperaRecusa(jogo, () => jogo.responder('J3', 'AUMENTAR'));
    expect(jogo.obterEstado().estado).toBe('AGUARDANDO_RESPOSTA');
  });

  test('TC-TRU-11 — Dupla não aumenta a própria aposta: J3 pede seis após truco de J1 aceito por J2 (R-26)', () => {
    const jogo = tru01();
    resp(jogo, 'J2', 'ACEITAR');
    jogarPrimeira(jogo); // J1
    jogarPrimeira(jogo); // J2
    expect(mao(jogo).vez).toBe('J3');
    esperaRecusa(jogo, () => jogo.pedirAumento('J3'));
    expect(mao(jogo).valor).toBe(3);
    expect(tiposDeAcao(jogo.acoesDisponiveis('J3'))).not.toContain('PEDIR_AUMENTO');
  });

  test('TC-TRU-12 — Quem aceitou pode aumentar depois: J4, na sua vez, pede seis (R-26)', () => {
    const jogo = tru01();
    resp(jogo, 'J2', 'ACEITAR');
    jogarPrimeira(jogo); // J1
    jogarPrimeira(jogo); // J2
    jogarPrimeira(jogo); // J3
    expect(mao(jogo).vez).toBe('J4');
    pedir(jogo, 'J4');
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_RESPOSTA');
    expect(e.mao.pedidoPendente).toMatchObject({ dupla: 'B', jogador: 'J4', valorProposto: 6 });
  });

  test('TC-TRU-13 — Truco na 3ª rodada: J3 pede truco, aguarda resposta da dupla B (R-29)', () => {
    const jogo = prepararMao({
      maos: {
        J1: ['4♦', '6♣', 'Q♦'],
        J2: ['3♣', '4♠', 'J♦'],
        J3: ['6♦', '2♦', 'K♦'],
        J4: ['7♠', '7♦', 'K♣'],
      },
    });
    jogar(jogo, 'J1 4♦, J2 3♣, J3 6♦, J4 7♠'); // B (J2)
    jogar(jogo, 'J2 4♠, J3 2♦, J4 7♦, J1 6♣'); // A (J3)
    expect(rodadasJogadas(jogo).map((r) => r.resultado)).toEqual(['B', 'A']);
    expect(mao(jogo).vez).toBe('J3');
    expect(mao(jogo).valor).toBe(1);

    pedir(jogo, 'J3');
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_RESPOSTA');
    expect(e.mao.pedidoPendente).toMatchObject({ dupla: 'A', jogador: 'J3', valorProposto: 3 });
    expect(tiposDeAcao(jogo.acoesDisponiveis('J2'))).toContain('ACEITAR');
    expect(tiposDeAcao(jogo.acoesDisponiveis('J4'))).toContain('ACEITAR');
  });

  test('TC-TRU-14 — Truco fora da vez: J2 pede truco na vez de J1 (R-22, R-38)', () => {
    const jogo = prepararMao();
    esperaRecusa(jogo, () => jogo.pedirAumento('J2'));
    esperaRecusa(jogo, () => jogo.pedirAumento('J3'));
    esperaRecusa(jogo, () => jogo.pedirAumento('J4'));
  });

  test('TC-TRU-15 — Parceiro de quem pediu não responde: J3 tenta aceitar (R-28)', () => {
    const jogo = tru01();
    esperaRecusa(jogo, () => jogo.responder('J3', 'ACEITAR'));
    esperaRecusa(jogo, () => jogo.responder('J3', 'CORRER'));
    esperaRecusa(jogo, () => jogo.responder('J3', 'AUMENTAR'));
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_RESPOSTA');
    expect(e.mao.pedidoPendente).toMatchObject({ dupla: 'A' });
  });

  test('TC-TRU-16 — Primeira resposta vale: J4 aceita; a corrida de J2 é recusada (R-28, D-05)', () => {
    const jogo = tru01();
    resp(jogo, 'J4', 'ACEITAR');
    expect(mao(jogo).valor).toBe(3);
    esperaRecusa(jogo, () => jogo.responder('J2', 'CORRER'));
    expect(jogo.obterEstado().placar).toEqual({ A: 0, B: 0 });
    expect(mao(jogo).valor).toBe(3);
  });

  test('TC-TRU-17 — Ninguém joga com pedido pendente: J1 e J2 tentam jogar (R-27)', () => {
    const jogo = tru01();
    const e = jogo.obterEstado();
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', e.mao.cartas.J1[0]));
    esperaRecusa(jogo, () => jogo.jogarCarta('J2', e.mao.cartas.J2[0]));
    // nem outro pedido (exceto aumentar como resposta)
    esperaRecusa(jogo, () => jogo.pedirAumento('J1'));
    esperaRecusa(jogo, () => jogo.pedirAumento('J2'));
  });

  test('TC-TRU-18 — Truco no meio da rodada: cartas de J1 e J2 continuam na mesa; valor 3; vez de J3 (R-22, R-29)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'B', 'A']) });
    const j1 = jogarPrimeira(jogo);
    const j2 = jogarPrimeira(jogo);
    expect([j1, j2]).toEqual(['J1', 'J2']);
    const mesaAntes = rodadasJogadas(jogo)[0].jogadas;

    pedir(jogo, 'J3');
    resp(jogo, 'J4', 'ACEITAR');
    const e = jogo.obterEstado();
    expect(rodadasJogadas(jogo)[0].jogadas).toEqual(mesaAntes);
    expect(e.mao.valor).toBe(3);
    expect(e.mao.vez).toBe('J3');
  });

  test('TC-TRU-19 — Truco depois de ganhar a 1ª: J1 pede, J2 aceita, A vence a 2ª => 3×0 (R-29, R-35)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    for (let i = 0; i < 4; i++) jogarPrimeira(jogo);
    expect(rodadasJogadas(jogo)[0].vencedor).toBe('J1');
    expect(mao(jogo).vez).toBe('J1');
    pedir(jogo, 'J1');
    resp(jogo, 'J2', 'ACEITAR');
    jogarAteOFim(jogo);
    expect(jogo.obterEstado().placar).toEqual({ A: 3, B: 0 });
  });

  test('TC-TRU-20 — Sem truco após a mão encerrar (A, A) (R-29, R-38)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    jogarAteOFim(jogo);
    expect(jogo.obterEstado().estado).toBe('MAO_ENCERRADA');
    for (const j of ['J1', 'J2', 'J3', 'J4']) esperaRecusa(jogo, () => jogo.pedirAumento(j));
  });

  test('TC-TRU-21 — Quem pediu o seis não pede o nove: pedido de J2 recusado; de J1 aceito (proposto 9) (R-26)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'B', 'A']) });
    pedir(jogo, 'J1'); // truco
    resp(jogo, 'J2', 'AUMENTAR'); // seis pedido por B
    resp(jogo, 'J1', 'ACEITAR'); // aceito por A
    expect(mao(jogo).valor).toBe(6);
    expect(mao(jogo).direitoDeAumentar).toBe('A');

    jogarPrimeira(jogo); // J1
    expect(mao(jogo).vez).toBe('J2');
    esperaRecusa(jogo, () => jogo.pedirAumento('J2'));
    jogarPrimeira(jogo); // J2
    jogarPrimeira(jogo); // J3
    jogarPrimeira(jogo); // J4 -> 1ª rodada = A (J1)
    expect(mao(jogo).vez).toBe('J1');

    pedir(jogo, 'J1');
    expect(mao(jogo).pedidoPendente).toMatchObject({ dupla: 'A', jogador: 'J1', valorProposto: 9 });
  });

  test('TC-TRU-22 — Nome do pedido muda com o valor (função pura) (R-24)', () => {
    expect([1, 3, 6, 9, 12].map(T.nomePedido)).toEqual(['Truco', 'Seis', 'Nove', 'Doze', null]);
  });

  test('TC-TRU-22 — Nome do pedido muda com o valor (opção disponível no jogo) (R-24)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'B', 'A']) });
    const rotulo = (j) => {
      const a = acao(jogo.acoesDisponiveis(j), 'PEDIR_AUMENTO');
      return a ? a.rotulo : null;
    };

    expect(rotulo('J1')).toBe('Truco'); // valor 1
    pedir(jogo, 'J1');
    resp(jogo, 'J2', 'ACEITAR');
    jogarPrimeira(jogo); // J1

    expect(rotulo('J2')).toBe('Seis'); // valor 3
    pedir(jogo, 'J2');
    resp(jogo, 'J1', 'ACEITAR');
    jogarPrimeira(jogo); // J2

    expect(rotulo('J3')).toBe('Nove'); // valor 6
    pedir(jogo, 'J3');
    resp(jogo, 'J4', 'ACEITAR');
    jogarPrimeira(jogo); // J3

    expect(rotulo('J4')).toBe('Doze'); // valor 9
    pedir(jogo, 'J4');
    resp(jogo, 'J1', 'ACEITAR');
    jogarPrimeira(jogo); // J4 -> 1ª rodada termina (J1 vence)

    expect(mao(jogo).valor).toBe(12);
    expect(mao(jogo).vez).toBe('J1');
    expect(rotulo('J1')).toBeNull(); // indisponível
  });

  test('TC-TRU-23 — Correr em rodada posterior: J2 pede seis na 2ª rodada; J1 corre => B ganha 3 (R-25, R-29)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['B', 'A', 'B']) });
    pedir(jogo, 'J1');
    resp(jogo, 'J2', 'ACEITAR');
    for (let i = 0; i < 4; i++) jogarPrimeira(jogo); // 1ª = B (J2)
    expect(mao(jogo).vez).toBe('J2');
    expect(mao(jogo).direitoDeAumentar).toBe('B');

    pedir(jogo, 'J2');
    resp(jogo, 'J1', 'CORRER');
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 0, B: 3 });
    expect(e.estado).toBe('MAO_ENCERRADA');
  });

  test('TC-TRU-24 — Quem corre perde mesmo à frente: A venceu a 1ª; J2 pede truco; J3 corre => B ganha 1 (R-25, R-30)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'B', 'A']) });
    for (let i = 0; i < 4; i++) jogarPrimeira(jogo); // 1ª = A (J1)
    jogarPrimeira(jogo); // J1 abre a 2ª
    expect(mao(jogo).vez).toBe('J2');
    pedir(jogo, 'J2');
    resp(jogo, 'J3', 'CORRER');
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 0, B: 1 });
    expect(e.estado).toBe('MAO_ENCERRADA');
    expect(e.mao.resultado).toBe('B');
  });

  test('TC-TRU-25 — Dupla que aceitou pode vencer: TC-TRU-02 + rodadas B, B => 0×3 (R-23, R-35)', () => {
    const jogo = tru01(maosParaResultados(['B', 'B']));
    resp(jogo, 'J2', 'ACEITAR');
    jogarAteOFim(jogo);
    expect(jogo.obterEstado().placar).toEqual({ A: 0, B: 3 });
  });

  test('TC-TRU-26 — Truco permitido com placar alto: 10×10, truco aceito, A vence => 12×10, partida encerrada (R-22, R-36)', () => {
    const jogo = prepararMao({ placar: { A: 10, B: 10 }, maos: maosParaResultados(['A', 'A']) });
    expect(mao(jogo).tipo).toBe('normal');
    pedir(jogo, 'J1');
    resp(jogo, 'J2', 'ACEITAR');
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 12, B: 10 });
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
    expect(e.vencedora).toBe('A');
  });
});
