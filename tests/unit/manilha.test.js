/**
 * 6.3 Vira e manilhas (TC-MAN) — R-03 a R-08, R-11
 */
const T = require('../support/impl');
const { c, chave, chaves, JOGADORES } = require('../support/cartas');
const {
  prepararMao,
  jogar,
  rodadasJogadas,
  maosParaResultados,
  jogarAteOFim,
  esperaOk,
} = require('../support/cenarios');

const f = (vira) => {
  const manilha = T.manilhaDe(c(vira));
  return (texto) => T.forca(c(texto), manilha, false);
};

describe('6.3 Vira e manilhas (TC-MAN)', () => {
  test.each([
    ['TC-MAN-01', 'Manilha da vira 4', '4♠', '5'],
    ['TC-MAN-02', 'Manilha da vira 5', '5♠', '6'],
    ['TC-MAN-03', 'Manilha da vira 6', '6♠', '7'],
    ['TC-MAN-04', 'Manilha da vira 7 (não existe 8)', '7♠', 'Q'],
    ['TC-MAN-05', 'Manilha da vira Q', 'Q♠', 'J'],
    ['TC-MAN-06', 'Manilha da vira J', 'J♠', 'K'],
    ['TC-MAN-07', 'Manilha da vira K', 'K♠', 'A'],
    ['TC-MAN-08', 'Manilha da vira A', 'A♠', '2'],
    ['TC-MAN-09', 'Manilha da vira 2', '2♠', '3'],
    ['TC-MAN-10', 'Manilha da vira 3 (circular)', '3♠', '4'],
  ])('%s — %s: vira %s => manilha %s (R-06)', (_id, _nome, vira, manilha) => {
    expect(T.manilhaDe(c(vira))).toBe(manilha);
  });

  test('TC-MAN-01..10 — o naipe da vira não altera a manilha', () => {
    for (const naipe of ['♦', '♠', '♥', '♣']) {
      expect(T.manilhaDe(c(`7${naipe}`))).toBe('Q');
      expect(T.manilhaDe(c(`3${naipe}`))).toBe('4');
    }
  });

  test('TC-MAN-11 — Ordem dos naipes das manilhas: 5♣ (13) > 5♥ (12) > 5♠ (11) > 5♦ (10) (R-07, R-08)', () => {
    const forca = f('4♥');
    expect(forca('5♣')).toBe(13);
    expect(forca('5♥')).toBe(12);
    expect(forca('5♠')).toBe(11);
    expect(forca('5♦')).toBe(10);
  });

  test('TC-MAN-12 — Zap vence Copas: J1 5♥, J2 5♣, J3 7♦, J4 K♠ => J2 vence (dupla B) (R-07)', () => {
    const jogo = prepararMao({ maos: { J1: ['5♥'], J2: ['5♣'], J3: ['7♦'], J4: ['K♠'] } });
    jogar(jogo, 'J1 5♥, J2 5♣, J3 7♦, J4 K♠');
    const [r1] = rodadasJogadas(jogo);
    expect(r1.resultado).toBe('B');
    expect(r1.vencedor).toBe('J2');
  });

  test('TC-MAN-13 — Manilha mais fraca (5♦) vence a carta comum mais forte (3♣) (R-07)', () => {
    const forca = f('4♥');
    expect(forca('5♦')).toBeGreaterThan(forca('3♣'));
  });

  test('TC-MAN-14 — Manilhas nunca empatam: os 6 pares entre 5♦, 5♠, 5♥, 5♣ têm vencedor (R-07)', () => {
    const forca = f('4♥');
    const manilhas = ['5♦', '5♠', '5♥', '5♣'];
    let pares = 0;
    for (let i = 0; i < manilhas.length; i++) {
      for (let k = i + 1; k < manilhas.length; k++) {
        pares++;
        expect(forca(manilhas[i])).not.toBe(forca(manilhas[k]));
        // numa rodada real, uma manilha de cada dupla: nunca dá empate
        const r = T.vencedorRodada(
          [
            { jogador: 'J1', carta: c(manilhas[i]), coberta: false },
            { jogador: 'J2', carta: c(manilhas[k]), coberta: false },
            { jogador: 'J3', carta: c('4♣'), coberta: false },
            { jogador: 'J4', carta: c('6♦'), coberta: false },
          ],
          '5',
        );
        expect(r.resultado).not.toBe('E');
        expect(r.vencedor).toBe('J2'); // a de naipe maior é sempre a segunda do par
      }
    }
    expect(pares).toBe(6);
  });

  test('TC-MAN-15 — Vira fica fora do jogo: mãos (12) + vira (1) + monte (27) = 40 distintas (R-05, R-11)', () => {
    const jogo = prepararMao({ vira: '4♥' });
    const e = jogo.obterEstado();
    expect(chave(e.mao.vira)).toBe('4♥');
    const naMao = JOGADORES.flatMap((j) => chaves(e.mao.cartas[j]));
    expect(naMao).toHaveLength(12);
    expect(naMao).not.toContain('4♥');
    expect(chaves(e.monte)).toHaveLength(27);
    expect(chaves(e.monte)).not.toContain('4♥');
    const todas = [...naMao, '4♥', ...chaves(e.monte)];
    expect(new Set(todas).size).toBe(40);
  });

  test('TC-MAN-16 — Carta do mesmo valor da vira é comum: força(4♣) = 0; 5♦ vence (R-04, R-06)', () => {
    const forca = f('4♥');
    expect(forca('4♣')).toBe(0);
    expect(forca('5♦')).toBeGreaterThan(forca('4♣'));
  });

  test('TC-MAN-17 — Manilha é recalculada a cada mão (funções puras) (R-06)', () => {
    const mao1 = f('7♦'); // manilha Q
    expect(mao1('Q♣')).toBeGreaterThan(mao1('3♦'));
    const mao2 = f('A♦'); // manilha 2
    expect(mao2('Q♣')).toBeLessThan(mao2('K♦'));
  });

  test('TC-MAN-17 — Manilha é recalculada a cada mão (motor do jogo) (R-06)', () => {
    // Mão 1: vira 7♦ (manilha Q); J1 joga Q♣ e vence o 3♦ de J2
    // Mão 2: vira A♦ (manilha 2); Q♣ é comum e perde para K♦
    const jogo = prepararMao({
      vira: '7♦',
      maos: { J1: ['Q♣', '4♦', '4♠'], J2: ['3♦', '4♣', '6♦'], J3: ['5♦'], J4: ['5♠'] },
      seguintes: [{ vira: 'A♦', maos: { J2: ['Q♣'], J3: ['K♦'] } }],
    });
    expect(jogo.obterEstado().mao.manilha).toBe('Q');
    jogar(jogo, 'J1 Q♣, J2 3♦');
    jogarAteOFim(jogo);
    expect(rodadasJogadas(jogo)[0].vencedor).toBe('J1');

    esperaOk(jogo.proximaMao(), 'proximaMao');
    esperaOk(jogo.distribuir(), 'distribuir');
    const e2 = jogo.obterEstado();
    expect(e2.carteador).toBe('J1');
    expect(chave(e2.mao.vira)).toBe('A♦');
    expect(e2.mao.manilha).toBe('2');
    // J2 abre: J2 Q♣ (comum), J3 K♦
    const outras = (j) => e2.mao.cartas[j].find((x) => !['Q♣', 'K♦'].includes(chave(x)));
    esperaOk(jogo.jogarCarta('J2', c('Q♣')));
    esperaOk(jogo.jogarCarta('J3', c('K♦')));
    esperaOk(jogo.jogarCarta('J4', outras('J4')));
    esperaOk(jogo.jogarCarta('J1', outras('J1')));
    const r = rodadasJogadas(jogo)[0];
    const forcaMao2 = f('A♦');
    // Q♣ perde para K♦ na mão 2
    expect(forcaMao2('Q♣')).toBeLessThan(forcaMao2('K♦'));
    expect(r.jogadas.find((x) => x.jogador === 'J2').carta).toEqual(
      expect.objectContaining({ valor: 'Q', naipe: '♣' }),
    );
    expect(r.resultado).toBe('A');
    expect(r.vencedor).toBe('J3'); // K♦ de J3 vence a Q♣ de J2
  });

  test('TC-MAN-18 — Manilha 4 vence o 3: vira 3♠, 4♦ vence 3♣ (R-06, R-07)', () => {
    const forca = f('3♠');
    expect(forca('4♦')).toBeGreaterThan(forca('3♣'));
    expect(forca('4♦')).toBe(10);
  });
});
