/**
 * 5.3 Funções puras (base dos testes unitários) — R-01, R-02, R-15, R-19, R-20, R-24, R-25
 */
const T = require('../support/impl');
const { c } = require('../support/cartas');
const { parseJogadas: parseJogadasPuras } = require('../support/cenarios');

describe('5.3 Funções puras', () => {
  describe('duplas e sentido do jogo (R-01, R-02, D-01)', () => {
    test('duplaDe: J1 e J3 = A; J2 e J4 = B', () => {
      expect(T.duplaDe('J1')).toBe('A');
      expect(T.duplaDe('J3')).toBe('A');
      expect(T.duplaDe('J2')).toBe('B');
      expect(T.duplaDe('J4')).toBe('B');
    });

    test('proximoJogador: J1 → J2 → J3 → J4 → J1', () => {
      expect(T.proximoJogador('J1')).toBe('J2');
      expect(T.proximoJogador('J2')).toBe('J3');
      expect(T.proximoJogador('J3')).toBe('J4');
      expect(T.proximoJogador('J4')).toBe('J1');
    });

    test('NAIPES em ordem de força de manilha: ♦ < ♠ < ♥ < ♣', () => {
      expect(T.NAIPES).toEqual(['♦', '♠', '♥', '♣']);
    });
  });

  describe('escada de valores (R-24, R-25)', () => {
    test('proximoValor: 1→3→6→9→12 e nada além de 12', () => {
      expect(T.proximoValor(1)).toBe(3);
      expect(T.proximoValor(3)).toBe(6);
      expect(T.proximoValor(6)).toBe(9);
      expect(T.proximoValor(9)).toBe(12);
      expect(T.proximoValor(12)).toBeNull();
    });

    test.each([
      [1, 1],
      [3, 3],
      [6, 6],
      [9, 9],
    ])('valorAoCorrer(%i) = %i (valor vigente antes do pedido)', (atual, esperado) => {
      expect(T.valorAoCorrer(atual)).toBe(esperado);
    });

    test.each([
      [1, 'Truco'],
      [3, 'Seis'],
      [6, 'Nove'],
      [9, 'Doze'],
      [12, null],
    ])('nomePedido(%i) = %p', (valor, nome) => {
      expect(T.nomePedido(valor)).toBe(nome);
    });
  });

  describe('vencedorRodada (R-15, R-18, D-03)', () => {
    const rodada = (texto) => T.vencedorRodada(parseJogadasPuras(texto), '5');

    test('vence a maior carta; retorna dupla e jogador', () => {
      expect(rodada('J1 7♦, J2 K♠, J3 A♣, J4 2♦')).toMatchObject({ resultado: 'B', vencedor: 'J4' });
    });

    test('empate entre duplas => E e vencedor null', () => {
      expect(rodada('J1 3♦, J2 3♣, J3 7♠, J4 Q♥')).toMatchObject({ resultado: 'E', vencedor: null });
    });

    test('parceiros com a maior carta: vence o primeiro a jogá-la', () => {
      expect(rodada('J1 3♦, J2 2♣, J3 3♠, J4 K♦')).toMatchObject({ resultado: 'A', vencedor: 'J1' });
      expect(rodada('J3 3♦, J4 2♣, J1 3♠, J2 K♦')).toMatchObject({ resultado: 'A', vencedor: 'J3' });
    });

    test('carta coberta não vale nada, mesmo o zap', () => {
      expect(rodada('J1 5♣ coberta, J2 4♦, J3 6♠, J4 7♦')).toMatchObject({
        resultado: 'B',
        vencedor: 'J4',
      });
    });

    test('só cobertas => E', () => {
      expect(rodada('J1 3♦ coberta, J2 2♦ coberta, J3 5♣ coberta, J4 6♦ coberta').resultado).toBe('E');
    });

    test('ordem de quem abriu não muda o resultado, só o vencedor entre parceiros', () => {
      expect(rodada('J2 K♠, J3 A♣, J4 2♦, J1 7♦')).toMatchObject({ resultado: 'B', vencedor: 'J4' });
    });

    test('aceita jogadas sem o campo coberta (padrão: aberta)', () => {
      const r = T.vencedorRodada(
        [
          { jogador: 'J1', carta: c('3♦') },
          { jogador: 'J2', carta: c('2♣') },
          { jogador: 'J3', carta: c('4♠') },
          { jogador: 'J4', carta: c('6♦') },
        ],
        '5',
      );
      expect(r).toMatchObject({ resultado: 'A', vencedor: 'J1' });
    });
  });

  describe('resultadoMao (R-19, R-20, D-04)', () => {
    test.each([
      [['A', 'A'], 'A'],
      [['B', 'B'], 'B'],
      [['A', 'B', 'A'], 'A'],
      [['A', 'B', 'B'], 'B'],
      [['B', 'A', 'A'], 'A'],
      [['B', 'A', 'B'], 'B'],
      [['A', 'E'], 'A'],
      [['B', 'E'], 'B'],
      [['E', 'A'], 'A'],
      [['E', 'B'], 'B'],
      [['E', 'E', 'A'], 'A'],
      [['E', 'E', 'B'], 'B'],
      [['E', 'E', 'E'], 'NINGUEM'],
      [['A', 'B', 'E'], 'A'],
      [['B', 'A', 'E'], 'B'],
    ])('as 15 sequências possíveis: %p => %s', (r, esperado) => {
      expect(T.resultadoMao(r)).toBe(esperado);
    });

    test.each([[[]], [['A']], [['B']], [['E']], [['A', 'B']], [['B', 'A']], [['E', 'E']]])(
      'mão ainda em andamento: %p',
      (r) => {
        expect(T.resultadoMao(r)).toBe('EM_ANDAMENTO');
      },
    );
  });
});
