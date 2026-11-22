/**
 * 5.4 Estados da partida — máquina de 6 estados.
 * Pedidos de truco só nascem em AGUARDANDO_JOGADA; ações recusadas não mudam o estado.
 */
const T = require('../support/impl');
const {
  prepararMao,
  maosParaResultados,
  jogarAteOFim,
  esperaOk,
  esperaRecusa,
} = require('../support/cenarios');

const estadoDe = (jogo) => jogo.obterEstado().estado;

describe('5.4 Máquina de estados', () => {
  test('AGUARDANDO_DISTRIBUICAO → AGUARDANDO_JOGADA (mão normal)', () => {
    const jogo = T.criarPartida({ semente: 3, carteadorInicial: 'J4' });
    expect(estadoDe(jogo)).toBe('AGUARDANDO_DISTRIBUICAO');
    expect(jogo.obterEstado().mao).toBeNull();
    expect(jogo.obterEstado().monte).toHaveLength(40);
    esperaOk(jogo.distribuir());
    expect(estadoDe(jogo)).toBe('AGUARDANDO_JOGADA');
  });

  test('AGUARDANDO_DISTRIBUICAO → AGUARDANDO_DECISAO_ONZE (uma dupla com 11)', () => {
    const jogo = prepararMao({ placar: { A: 3, B: 11 } });
    expect(estadoDe(jogo)).toBe('AGUARDANDO_DECISAO_ONZE');
  });

  test('AGUARDANDO_DECISAO_ONZE → AGUARDANDO_JOGADA (JOGAR, valor 3) / → MAO_ENCERRADA (CORRER)', () => {
    const jogar = prepararMao({ placar: { A: 11, B: 0 } });
    esperaOk(jogar.decidirMaoDeOnze('J1', 'JOGAR'));
    expect(estadoDe(jogar)).toBe('AGUARDANDO_JOGADA');
    expect(jogar.obterEstado().mao.valor).toBe(3);

    const correr = prepararMao({ placar: { A: 11, B: 0 } });
    esperaOk(correr.decidirMaoDeOnze('J1', 'CORRER'));
    expect(estadoDe(correr)).toBe('MAO_ENCERRADA');
  });

  test('AGUARDANDO_JOGADA → AGUARDANDO_RESPOSTA → (ACEITAR) AGUARDANDO_JOGADA', () => {
    const jogo = prepararMao();
    esperaOk(jogo.pedirAumento('J1'));
    expect(estadoDe(jogo)).toBe('AGUARDANDO_RESPOSTA');
    esperaOk(jogo.responder('J2', 'ACEITAR'));
    expect(estadoDe(jogo)).toBe('AGUARDANDO_JOGADA');
  });

  test('AGUARDANDO_RESPOSTA → (AUMENTAR) AGUARDANDO_RESPOSTA → (CORRER) MAO_ENCERRADA', () => {
    const jogo = prepararMao();
    esperaOk(jogo.pedirAumento('J1'));
    esperaOk(jogo.responder('J2', 'AUMENTAR'));
    expect(estadoDe(jogo)).toBe('AGUARDANDO_RESPOSTA');
    esperaOk(jogo.responder('J1', 'CORRER'));
    expect(estadoDe(jogo)).toBe('MAO_ENCERRADA');
  });

  test('carta jogada → mesmo estado ou MAO_ENCERRADA', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    const e = jogo.obterEstado();
    esperaOk(jogo.jogarCarta('J1', e.mao.cartas.J1[0]));
    expect(estadoDe(jogo)).toBe('AGUARDANDO_JOGADA');
    jogarAteOFim(jogo);
    expect(estadoDe(jogo)).toBe('MAO_ENCERRADA');
    expect(jogo.obterEstado().mao.vez).toBeNull();
  });

  test('MAO_ENCERRADA → (proximaMao) AGUARDANDO_DISTRIBUICAO com carteador avançado', () => {
    const jogo = prepararMao({ carteador: 'J3', maos: maosParaResultados(['B', 'B']) });
    jogarAteOFim(jogo);
    esperaOk(jogo.proximaMao());
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_DISTRIBUICAO');
    expect(e.carteador).toBe('J4');
    expect(e.mao).toBeNull();
  });

  test('MAO_ENCERRADA com dupla em 12 → PARTIDA_ENCERRADA → (novaPartida) AGUARDANDO_DISTRIBUICAO 0×0', () => {
    const jogo = prepararMao({ placar: { A: 0, B: 10 }, maos: maosParaResultados(['B', 'B']) });
    esperaOk(jogo.pedirAumento('J1'));
    esperaOk(jogo.responder('J2', 'ACEITAR'));
    jogarAteOFim(jogo);
    expect(estadoDe(jogo)).toBe('PARTIDA_ENCERRADA');
    expect(jogo.obterEstado().vencedora).toBe('B');
    esperaOk(jogo.novaPartida({ carteadorInicial: 'J1' }));
    const e = jogo.obterEstado();
    expect(e.estado).toBe('AGUARDANDO_DISTRIBUICAO');
    expect(e.placar).toEqual({ A: 0, B: 0 });
    expect(e.vencedora).toBeNull();
  });

  test('ações fora do estado certo são recusadas e não mudam nada', () => {
    const inicio = T.criarPartida({ semente: 3, carteadorInicial: 'J4' });
    esperaRecusa(inicio, () => inicio.proximaMao());
    esperaRecusa(inicio, () => inicio.pedirAumento('J1'));
    esperaRecusa(inicio, () => inicio.novaPartida());

    const emJogo = prepararMao();
    esperaRecusa(emJogo, () => emJogo.distribuir());
    esperaRecusa(emJogo, () => emJogo.proximaMao());

    const encerrada = prepararMao({ maos: maosParaResultados(['A', 'A']) });
    jogarAteOFim(encerrada);
    esperaRecusa(encerrada, () => encerrada.distribuir());
    esperaRecusa(encerrada, () => encerrada.novaPartida());
  });
});
