/**
 * 6.2 Força das cartas comuns (TC-FOR) — R-04, R-08
 */
const T = require('../support/impl');
const { c, cs, chaves } = require('../support/cartas');

const forcaCom = (vira) => {
  const manilha = T.manilhaDe(c(vira));
  return (texto, coberta = false) => T.forca(c(texto), manilha, coberta);
};

/** Ordena por força crescente (desempate estável pela ordem de entrada) */
const ordenar = (vira, cartas) => {
  const manilha = T.manilhaDe(c(vira));
  return chaves([...cartas].sort((a, b) => T.forca(a, manilha) - T.forca(b, manilha)));
};

describe('6.2 Força das cartas comuns (TC-FOR)', () => {
  test('TC-FOR-01 — Ordem das cartas fracas: 4 < 5 < 6 < 7 < Q < J < K < A < 2 (vira 2♦)', () => {
    const esperado = ['4♣', '5♣', '6♣', '7♣', 'Q♣', 'J♣', 'K♣', 'A♣', '2♣'];
    const embaralhadas = cs('K♣ 4♣ 2♣ Q♣ 7♣ A♣ 5♣ J♣ 6♣');
    expect(ordenar('2♦', embaralhadas)).toEqual(esperado);

    const f = forcaCom('2♦');
    for (let i = 1; i < esperado.length; i++) {
      expect(f(esperado[i])).toBeGreaterThan(f(esperado[i - 1]));
    }
  });

  test('TC-FOR-02 — Ordem das cartas fortes: 3 > 2 > K > J > Q (vira K♦, manilha A)', () => {
    const f = forcaCom('K♦');
    const decrescente = ['3♠', '2♠', 'K♣', 'J♣', 'Q♣'];
    for (let i = 1; i < decrescente.length; i++) {
      expect(f(decrescente[i - 1])).toBeGreaterThan(f(decrescente[i]));
    }
    expect(ordenar('K♦', cs('Q♣ 3♠ J♣ 2♠ K♣')).reverse()).toEqual(decrescente);
  });

  test('TC-FOR-03 — Dama é menor que Valete: J♠ vence Q♣ (vira 4♦)', () => {
    const f = forcaCom('4♦');
    expect(f('J♠')).toBeGreaterThan(f('Q♣'));
  });

  test('TC-FOR-04 — Valete é menor que Rei: K♦ vence J♣ (vira 4♦)', () => {
    const f = forcaCom('4♦');
    expect(f('K♦')).toBeGreaterThan(f('J♣'));
  });

  test('TC-FOR-05 — 3 é a carta comum mais forte: 3♦ vence A♣, 2♣ e K♣ (vira 4♦)', () => {
    const f = forcaCom('4♦');
    for (const outra of ['A♣', '2♣', 'K♣']) expect(f('3♦')).toBeGreaterThan(f(outra));
  });

  test('TC-FOR-06 — 4 é a carta comum mais fraca: 5♦ vence 4♣ (vira 7♦, manilha Q)', () => {
    const f = forcaCom('7♦');
    expect(f('5♦')).toBeGreaterThan(f('4♣'));
    for (const outra of ['5♦', '6♠', '7♥', 'J♣', 'K♦', 'A♠', '2♥', '3♣']) {
      expect(f('4♣')).toBeLessThan(f(outra));
    }
  });

  test('TC-FOR-07 — Naipe não desempata carta comum: força(7♣) = força(7♦) = 3 (R-04, R-08)', () => {
    const f = forcaCom('4♦');
    expect(f('7♣')).toBe(3);
    expect(f('7♦')).toBe(3);
    expect(f('7♣')).toBe(f('7♦'));
  });

  test('TC-FOR-08 — 2 é maior que Ás: 2♥ vence A♠ (vira 4♦)', () => {
    const f = forcaCom('4♦');
    expect(f('2♥')).toBeGreaterThan(f('A♠'));
  });

  describe('R-08 — Força numérica', () => {
    test('carta comum = posição na sequência (4 = 0 … 3 = 9)', () => {
      // vira 3♠ => manilha 4; usamos vira 2♦ (manilha 3) para 4..2 e vira 4♦ (manilha 5) para o 3
      const f2 = forcaCom('2♦');
      ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2'].forEach((v, i) => {
        expect(f2(`${v}♠`)).toBe(i);
      });
      expect(forcaCom('4♦')('3♠')).toBe(9);
    });

    test('manilhas = 10 (♦), 11 (♠), 12 (♥), 13 (♣)', () => {
      const f = forcaCom('4♥');
      expect(f('5♦')).toBe(10);
      expect(f('5♠')).toBe(11);
      expect(f('5♥')).toBe(12);
      expect(f('5♣')).toBe(13);
    });

    test('carta coberta = −1, mesmo sendo o zap', () => {
      const f = forcaCom('4♥');
      expect(f('5♣', true)).toBe(-1);
      expect(f('3♦', true)).toBe(-1);
      expect(f('4♣', true)).toBe(-1);
    });

    test('SEQ exportada na ordem da R-04', () => {
      expect(T.SEQ).toEqual(['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3']);
    });
  });
});
