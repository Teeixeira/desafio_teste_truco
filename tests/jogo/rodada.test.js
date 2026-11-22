/**
 * 6.5 Vencedor da rodada (TC-ROD) — R-07, R-14 a R-17, D-02
 * Todos com vira 4♥ (manilha 5). As jogadas estão na ordem em que acontecem.
 */
const T = require('../support/impl');
const {
  prepararMao,
  parseJogadas,
  jogar,
  jogarPrimeira,
  rodadasJogadas,
  esperaOk,
} = require('../support/cenarios');
const { c } = require('../support/cartas');

const CASOS = [
  ['TC-ROD-01', 'Maior carta comum vence', 'J1 7♦, J2 K♠, J3 A♣, J4 2♦', 'B', 'J4'],
  ['TC-ROD-02', 'Manilha vence cartas comuns', 'J1 3♣, J2 5♦, J3 2♠, J4 A♥', 'B', 'J2'],
  ['TC-ROD-03', 'Duas manilhas: decide o naipe (Copas > Espadas)', 'J1 5♠, J2 5♥, J3 3♦, J4 6♣', 'B', 'J2'],
  ['TC-ROD-04', 'Parceiros com a mesma maior carta não empatam', 'J1 3♦, J2 2♣, J3 3♠, J4 K♦', 'A', 'J1'],
  ['TC-ROD-05', 'Empate entre duplas', 'J1 3♦, J2 3♣, J3 7♠, J4 Q♥', 'E', null],
  ['TC-ROD-06', 'Empate abaixo da maior carta não conta', 'J1 2♦, J2 2♠, J3 3♥, J4 A♣', 'A', 'J3'],
  ['TC-ROD-07', 'Quatro cartas de mesmo valor', 'J1 K♦, J2 K♠, J3 K♥, J4 K♣', 'E', null],
  ['TC-ROD-08', 'Três cartas de mesmo valor no topo (há Ás das duas duplas)', 'J1 A♦, J2 A♠, J3 A♥, J4 7♣', 'E', null],
  ['TC-ROD-09', 'Manilha desfaz um empate', 'J1 3♦, J2 3♣, J3 5♦, J4 2♥', 'A', 'J3'],
];

/** Mãos em que a 1ª carta de cada jogador é a da rodada descrita */
const maosDaRodada = (texto) => {
  const maos = {};
  for (const { jogador, carta } of parseJogadas(texto)) maos[jogador] = [carta];
  return maos;
};

describe('6.5 Vencedor da rodada (TC-ROD)', () => {
  describe('função pura vencedorRodada', () => {
    test.each(CASOS)('%s — %s: %s => %s (vencedor %s)', (_id, _nome, jogadas, resultado, vencedor) => {
      expect(T.vencedorRodada(parseJogadas(jogadas), '5')).toMatchObject({ resultado, vencedor });
    });
  });

  describe('motor do jogo (1ª rodada aberta por J1, carteador J4)', () => {
    test.each(CASOS)('%s — %s: %s => %s (vencedor %s)', (_id, _nome, jogadas, resultado, vencedor) => {
      const jogo = prepararMao({ maos: maosDaRodada(jogadas) });
      jogar(jogo, jogadas);
      const [r1] = rodadasJogadas(jogo);
      expect(r1.abriu).toBe('J1');
      expect(r1.resultado).toBe(resultado);
      expect(r1.vencedor).toBe(vencedor);
    });
  });

  test('TC-ROD-10 — Vencedor abre a próxima rodada: J3 venceu a 1ª, ordem J3 → J4 → J1 → J2 (R-16)', () => {
    const jogo = prepararMao({ maos: { J1: ['4♦'], J2: ['6♦'], J3: ['3♠'], J4: ['7♣'] } });
    jogar(jogo, 'J1 4♦, J2 6♦, J3 3♠, J4 7♣');
    expect(rodadasJogadas(jogo)[0].vencedor).toBe('J3');
    expect(jogo.obterEstado().mao.vez).toBe('J3');
    const ordem = [];
    for (let i = 0; i < 4; i++) ordem.push(jogarPrimeira(jogo));
    expect(ordem).toEqual(['J3', 'J4', 'J1', 'J2']);
    expect(rodadasJogadas(jogo)[1].abriu).toBe('J3');
  });

  test('TC-ROD-11 — Após empate, abre quem abriu (J1) (R-17, D-02)', () => {
    const jogo = prepararMao({ maos: { J1: ['3♦'], J2: ['3♣'], J3: ['7♠'], J4: ['Q♥'] } });
    jogar(jogo, 'J1 3♦, J2 3♣, J3 7♠, J4 Q♥');
    expect(rodadasJogadas(jogo)[0].resultado).toBe('E');
    expect(jogo.obterEstado().mao.vez).toBe('J1');
  });

  test('TC-ROD-12 — Após empate, abre quem abriu (J3) (R-17, D-02)', () => {
    // carteador J2: J3 abre a 1ª; 1ª = E; J3 abre a 2ª; 2ª = E; J3 abre a 3ª
    const jogo = prepararMao({
      carteador: 'J2',
      maos: {
        J3: ['3♦', '2♦'],
        J4: ['3♣', '2♣'],
        J1: ['7♠', '6♠'],
        J2: ['Q♥', '6♥'],
      },
    });
    jogar(jogo, 'J3 3♦, J4 3♣, J1 7♠, J2 Q♥');
    expect(rodadasJogadas(jogo)[0].resultado).toBe('E');
    expect(jogo.obterEstado().mao.vez).toBe('J3');
    jogar(jogo, 'J3 2♦, J4 2♣, J1 6♠, J2 6♥');
    const r2 = rodadasJogadas(jogo)[1];
    expect(r2.abriu).toBe('J3');
    expect(r2.resultado).toBe('E');
    expect(jogo.obterEstado().mao.vez).toBe('J3');
  });

  test('TC-ROD-13 — Rodada termina só com 4 cartas (R-14)', () => {
    const jogo = prepararMao({ maos: { J1: ['7♦'], J2: ['K♠'], J3: ['A♣'], J4: ['2♦'] } });
    jogar(jogo, 'J1 7♦, J2 K♠, J3 A♣');
    const parcial = rodadasJogadas(jogo)[0];
    expect(parcial.jogadas).toHaveLength(3);
    expect(parcial.resultado).toBeNull();
    expect(parcial.vencedor).toBeNull();
    expect(jogo.obterEstado().mao.vez).toBe('J4');

    esperaOk(jogo.jogarCarta('J4', c('2♦')));
    const completa = rodadasJogadas(jogo)[0];
    expect(completa.resultado).toBe('B');
    expect(completa.vencedor).toBe('J4');
  });
});
