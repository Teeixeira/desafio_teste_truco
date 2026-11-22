/**
 * 6.12 Ações inválidas (TC-INV) — R-01, R-03, R-14, R-19, R-23, R-28, R-31, R-36, R-38
 * Toda ação recusada deve devolver um motivo e deixar o estado do jogo idêntico ao de antes
 * (o helper esperaRecusa compara um snapshot antes e depois em TODOS os testes da suíte).
 */
const T = require('../support/impl');
const { c, chaves } = require('../support/cartas');
const {
  prepararMao,
  maosParaResultados,
  jogar,
  jogarAteOFim,
  rodadasJogadas,
  esperaOk,
  esperaRecusa,
  tiposDeAcao,
} = require('../support/cenarios');

/** Partida encerrada: 9×4, truco aceito, A vence */
function partidaEncerrada() {
  const jogo = prepararMao({ placar: { A: 9, B: 4 }, maos: maosParaResultados(['A', 'A']) });
  esperaOk(jogo.pedirAumento('J1'));
  esperaOk(jogo.responder('J2', 'ACEITAR'));
  jogarAteOFim(jogo);
  expect(jogo.obterEstado().estado).toBe('PARTIDA_ENCERRADA');
  return jogo;
}

describe('6.12 Ações inválidas (TC-INV)', () => {
  test('TC-INV-01 — Jogar fora da vez: recusado com "Não é sua vez" (R-14, R-38)', () => {
    const jogo = prepararMao({ maos: { J2: ['3♣'] } });
    esperaRecusa(jogo, () => jogo.jogarCarta('J2', c('3♣')), /não é sua vez/i);
  });

  test('TC-INV-02 — Jogar carta que não tem: recusado com "Carta não está na sua mão" (R-38)', () => {
    const jogo = prepararMao({ maos: { J2: ['3♣'] } });
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', c('3♣')), /não está na sua mão/i);
  });

  test('TC-INV-03 — Reusar carta jogada: J1 jogou 7♦ na 1ª e tenta de novo na 2ª (R-14, R-38)', () => {
    const jogo = prepararMao({ maos: { J1: ['7♦'], J2: ['4♠'], J3: ['6♦'], J4: ['6♣'] } });
    jogar(jogo, 'J1 7♦, J2 4♠, J3 6♦, J4 6♣');
    expect(rodadasJogadas(jogo)[0].vencedor).toBe('J1');
    expect(jogo.obterEstado().mao.vez).toBe('J1');
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', c('7♦')));
  });

  test('TC-INV-04 — Duas cartas na mesma rodada: J1 acabou de jogar; vez de J2 (R-14, R-38)', () => {
    const jogo = prepararMao();
    const cartasJ1 = jogo.obterEstado().mao.cartas.J1;
    esperaOk(jogo.jogarCarta('J1', cartasJ1[0]));
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', cartasJ1[1]), /não é sua vez/i);
  });

  test('TC-INV-05 — Jogar após a mão encerrar (A, A): a 3ª rodada não existe (R-19, R-38)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.estado).toBe('MAO_ENCERRADA');
    for (const j of ['J1', 'J2', 'J3', 'J4']) {
      esperaRecusa(jogo, () => jogo.jogarCarta(j, e.mao.cartas[j][0]));
    }
    expect(rodadasJogadas(jogo)).toHaveLength(2);
  });

  test('TC-INV-06 — Responder sem pedido: J2 responde ACEITAR (R-23, R-38)', () => {
    const jogo = prepararMao();
    esperaRecusa(jogo, () => jogo.responder('J2', 'ACEITAR'));
    esperaRecusa(jogo, () => jogo.responder('J2', 'CORRER'));
    esperaRecusa(jogo, () => jogo.responder('J2', 'AUMENTAR'));
  });

  test('TC-INV-07 — Responder o próprio pedido: J1 pediu truco e responde ACEITAR (R-28, R-38)', () => {
    const jogo = prepararMao();
    esperaOk(jogo.pedirAumento('J1'));
    esperaRecusa(jogo, () => jogo.responder('J1', 'ACEITAR'));
    esperaRecusa(jogo, () => jogo.responder('J1', 'CORRER'));
  });

  test('TC-INV-08 — Jogador inexistente: ações enviadas por "J5" (R-01, R-38)', () => {
    const jogo = prepararMao();
    const carta = jogo.obterEstado().mao.cartas.J1[0];
    esperaRecusa(jogo, () => jogo.jogarCarta('J5', carta));
    esperaRecusa(jogo, () => jogo.pedirAumento('J5'));
    esperaOk(jogo.pedirAumento('J1'));
    esperaRecusa(jogo, () => jogo.responder('J5', 'ACEITAR'));
    expect(jogo.acoesDisponiveis('J5')).toEqual([]);

    const onze = prepararMao({ placar: { A: 11, B: 5 } });
    esperaRecusa(onze, () => onze.decidirMaoDeOnze('J5', 'JOGAR'));
  });

  test('TC-INV-09 — Número errado de jogadores: iniciar com 3 e com 5 => ambas recusadas (R-01)', () => {
    expect(() => T.criarPartida({ jogadores: ['J1', 'J2', 'J3'] })).toThrow(/\S/);
    expect(() => T.criarPartida({ jogadores: ['J1', 'J2', 'J3', 'J4', 'J5'] })).toThrow(/\S/);
    expect(() => T.criarPartida({ jogadores: ['J1', 'J2', 'J3', 'J4'] })).not.toThrow();
  });

  test('TC-INV-10 — Duplas lado a lado (J1 + J2): recusado; duplas são sempre J1 + J3 e J2 + J4 (R-01)', () => {
    expect(() => T.criarPartida({ duplas: { A: ['J1', 'J2'], B: ['J3', 'J4'] } })).toThrow(/\S/);
    expect(() => T.criarPartida({ duplas: { A: ['J1', 'J4'], B: ['J2', 'J3'] } })).toThrow(/\S/);
    expect(() => T.criarPartida({ duplas: { A: ['J1', 'J3'], B: ['J2', 'J4'] } })).not.toThrow();
  });

  test('TC-INV-11 — Ação após fim da partida: jogar carta e pedir truco => ambas recusadas (R-36, R-38)', () => {
    const jogo = partidaEncerrada();
    const e = jogo.obterEstado();
    for (const j of ['J1', 'J2', 'J3', 'J4']) {
      const carta = e.mao.cartas[j][0] || c('4♦');
      esperaRecusa(jogo, () => jogo.jogarCarta(j, carta));
      esperaRecusa(jogo, () => jogo.pedirAumento(j));
      esperaRecusa(jogo, () => jogo.responder(j, 'ACEITAR'));
      esperaRecusa(jogo, () => jogo.decidirMaoDeOnze(j, 'JOGAR'));
    }
  });

  test('TC-INV-12 — Recusa não muda o estado: placar, mãos, mesa, vez, valor e pedido pendente idênticos (R-38)', () => {
    const jogo = prepararMao({ placar: { A: 4, B: 7 }, maos: maosParaResultados(['A', 'B', 'A']) });
    esperaOk(jogo.jogarCarta('J1', jogo.obterEstado().mao.cartas.J1[0]));
    esperaOk(jogo.pedirAumento('J2'));
    const antes = jogo.obterEstado();

    const tentativas = [
      () => jogo.jogarCarta('J2', antes.mao.cartas.J2[0]),
      () => jogo.jogarCarta('J3', antes.mao.cartas.J3[0]),
      () => jogo.pedirAumento('J1'),
      () => jogo.pedirAumento('J2'),
      () => jogo.responder('J2', 'ACEITAR'),
      () => jogo.responder('J4', 'CORRER'),
      () => jogo.decidirMaoDeOnze('J1', 'JOGAR'),
      () => jogo.distribuir(),
      () => jogo.proximaMao(),
      () => jogo.novaPartida(),
      () => jogo.responder('J1', 'TALVEZ'),
      () => jogo.jogarCarta('J9', c('3♦')),
    ];
    for (const t of tentativas) esperaRecusa(jogo, t);

    const depois = jogo.obterEstado();
    expect(depois).toEqual(antes);
    expect(depois.placar).toEqual({ A: 4, B: 7 });
    expect(depois.mao.valor).toBe(1);
    expect(depois.mao.vez).toBe('J2');
    expect(depois.mao.pedidoPendente).toMatchObject({ dupla: 'B', valorProposto: 3 });
  });

  test('TC-INV-12 — obterEstado devolve uma cópia: alterar o retorno não altera o jogo', () => {
    const jogo = prepararMao();
    const e = jogo.obterEstado();
    const original = jogo.obterEstado();
    e.placar.A = 99;
    e.mao.cartas.J1.pop();
    e.mao.valor = 12;
    expect(jogo.obterEstado()).toEqual(original);
  });

  test('TC-INV-13 — Recusa traz motivo não vazio e específico (R-38)', () => {
    const jogo = prepararMao({ maos: { J2: ['3♣'] } });
    const foraDaVez = esperaRecusa(jogo, () => jogo.jogarCarta('J2', c('3♣')));
    const naoTem = esperaRecusa(jogo, () => jogo.jogarCarta('J1', c('3♣')));
    const semPedido = esperaRecusa(jogo, () => jogo.responder('J2', 'ACEITAR'));
    // motivos diferentes para problemas diferentes
    expect(foraDaVez.motivo).not.toBe(naoTem.motivo);
    expect(new Set([foraDaVez.motivo, naoTem.motivo, semPedido.motivo]).size).toBe(3);
  });

  test('TC-INV-14 — Decisão de onze fora da mão de onze (placar 5×5): J1 decide JOGAR => recusado (R-31, R-38)', () => {
    const jogo = prepararMao({ placar: { A: 5, B: 5 } });
    esperaRecusa(jogo, () => jogo.decidirMaoDeOnze('J1', 'JOGAR'));
    expect(tiposDeAcao(jogo.acoesDisponiveis('J1'))).not.toContain('DECIDIR_ONZE');
  });

  test('TC-INV-15 — Carta inexistente: J1 joga 8♣ => recusado (R-03, R-38)', () => {
    const jogo = prepararMao();
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', c('8♣')));
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', { valor: '10', naipe: '♣' }));
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', { valor: 'Coringa', naipe: '' }));
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', null));
    esperaRecusa(jogo, () => jogo.jogarCarta('J1', 7)); // posição inexistente
    expect(chaves(jogo.obterEstado().mao.cartas.J1)).toHaveLength(3);
  });

  describe('entradas malformadas também são recusadas sem exceção (R-38)', () => {
    test('resposta e decisão com opção desconhecida', () => {
      const jogo = prepararMao();
      esperaOk(jogo.pedirAumento('J1'));
      esperaRecusa(jogo, () => jogo.responder('J2', 'TALVEZ'));
      esperaRecusa(jogo, () => jogo.responder('J2', undefined));

      const onze = prepararMao({ placar: { A: 11, B: 5 } });
      esperaRecusa(onze, () => onze.decidirMaoDeOnze('J1', 'PENSAR'));
      esperaRecusa(onze, () => onze.decidirMaoDeOnze('J1'));
    });
  });
});
