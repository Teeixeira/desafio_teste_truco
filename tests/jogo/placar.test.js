/**
 * 6.11 Placar e fim de partida (TC-PLA) — R-21, R-25, R-35, R-36, R-37, D-08, D-09, D-10
 */
const T = require('../support/impl');
const { JOGADORES, chave } = require('../support/cartas');
const {
  prepararMao,
  maosParaResultados,
  jogarAteOFim,
  esperaOk,
  esperaRecusa,
  tiposDeAcao,
  cartasEmJogo,
  mulberry32,
} = require('../support/cenarios');

/** TC-PLA-03: placar 9×4; truco aceito; dupla A vence a mão */
function pla03() {
  const jogo = prepararMao({ placar: { A: 9, B: 4 }, maos: maosParaResultados(['A', 'A']) });
  esperaOk(jogo.pedirAumento('J1'));
  esperaOk(jogo.responder('J2', 'ACEITAR'));
  jogarAteOFim(jogo);
  return jogo;
}

describe('6.11 Placar e fim de partida (TC-PLA)', () => {
  test('TC-PLA-01 — Placar inicial 0×0; primeira mão normal valendo 1 (R-21, R-37)', () => {
    const jogo = T.criarPartida({ semente: 1 });
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 0, B: 0 });
    expect(e.estado).toBe('AGUARDANDO_DISTRIBUICAO');
    expect(e.vencedora).toBeNull();
    esperaOk(jogo.distribuir());
    const m = jogo.obterEstado().mao;
    expect(m.tipo).toBe('normal');
    expect(m.valor).toBe(1);
    expect(m.direitoDeAumentar).toBe('QUALQUER');
    expect(m.pedidoPendente).toBeNull();
  });

  test('TC-PLA-02 — Mão simples soma 1: dupla A vence sem truco => 1×0 (R-21, R-35)', () => {
    const jogo = prepararMao({ maos: maosParaResultados(['A', 'B', 'A']) });
    jogarAteOFim(jogo);
    expect(jogo.obterEstado().placar).toEqual({ A: 1, B: 0 });
  });

  test('TC-PLA-03 — Vitória com exatamente 12: 9×4, truco aceito, A vence => 12×4, PARTIDA_ENCERRADA (R-36)', () => {
    const e = pla03().obterEstado();
    expect(e.placar).toEqual({ A: 12, B: 4 });
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
    expect(e.vencedora).toBe('A');
  });

  test('TC-PLA-04 — Placar limitado a 12: 10×4, seis aceito, A vence => 12×4 (não 16) (R-36, D-08)', () => {
    const jogo = prepararMao({ placar: { A: 10, B: 4 }, maos: maosParaResultados(['A', 'A']) });
    esperaOk(jogo.pedirAumento('J1'));
    esperaOk(jogo.responder('J2', 'AUMENTAR'));
    esperaOk(jogo.responder('J1', 'ACEITAR'));
    expect(jogo.obterEstado().mao.valor).toBe(6);
    jogarAteOFim(jogo);
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 12, B: 4 });
    expect(e.vencedora).toBe('A');
  });

  test('TC-PLA-05 — Corrida também encerra a partida: 0×9, J1 truco, J2 seis, J1 corre => 0×12, vencedora B (R-25, R-36)', () => {
    const jogo = prepararMao({ placar: { A: 0, B: 9 } });
    esperaOk(jogo.pedirAumento('J1'));
    esperaOk(jogo.responder('J2', 'AUMENTAR'));
    esperaOk(jogo.responder('J1', 'CORRER'));
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 0, B: 12 });
    expect(e.estado).toBe('PARTIDA_ENCERRADA');
    expect(e.vencedora).toBe('B');
  });

  test('TC-PLA-06 — Partida encerrada para de distribuir; só novaPartida está disponível (R-36, D-09)', () => {
    const jogo = pla03();
    esperaRecusa(jogo, () => jogo.distribuir());
    esperaRecusa(jogo, () => jogo.proximaMao());
    for (const j of JOGADORES) {
      expect(tiposDeAcao(jogo.acoesDisponiveis(j))).toEqual(['NOVA_PARTIDA']);
    }
  });

  test('TC-PLA-07 — Nova partida com carteadorInicial = J2: 0×0, carteador J2, J3 abre, mão normal (R-37, D-10)', () => {
    const jogo = pla03();
    esperaOk(jogo.novaPartida({ carteadorInicial: 'J2' }), 'novaPartida');
    const e = jogo.obterEstado();
    expect(e.placar).toEqual({ A: 0, B: 0 });
    expect(e.carteador).toBe('J2');
    expect(e.vencedora).toBeNull();
    expect(e.estado).toBe('AGUARDANDO_DISTRIBUICAO');
    esperaOk(jogo.distribuir());
    const m = jogo.obterEstado().mao;
    expect(m.vez).toBe('J3');
    expect(m.tipo).toBe('normal');
    expect(m.valor).toBe(1);
  });

  test('TC-PLA-07 — novaPartida é recusada enquanto a partida não terminou (R-37, R-38)', () => {
    const jogo = prepararMao();
    esperaRecusa(jogo, () => jogo.novaPartida());
  });

  test('TC-PLA-08 — Placar nunca diminui: 1.000 mãos aleatórias com semente fixa (R-35)', () => {
    const rng = mulberry32(2026);
    const escolher = (lista) => lista[Math.floor(rng() * lista.length)];
    const VALIDOS = [0, 1, 3, 6, 9, 12];

    const jogo = T.criarPartida({ semente: 2026, carteadorInicial: 'J4' });
    let maos = 0;
    let partidas = 1;
    let antes = null;
    let passos = 0;

    while (maos < 1000) {
      if (++passos > 200000) throw new Error('Simulação não progrediu (possível travamento)');
      const e = jogo.obterEstado();

      if (e.estado === 'AGUARDANDO_DISTRIBUICAO') {
        antes = { ...e.placar };
        esperaOk(jogo.distribuir(), 'distribuir');
        const todas = cartasEmJogo(jogo.obterEstado()).map(chave);
        expect(new Set(todas).size).toBe(40);
        continue;
      }

      if (e.estado === 'MAO_ENCERRADA' || e.estado === 'PARTIDA_ENCERRADA') {
        maos++;
        const dA = e.placar.A - antes.A;
        const dB = e.placar.B - antes.B;
        // nunca diminui e no máximo uma dupla pontua
        expect(dA).toBeGreaterThanOrEqual(0);
        expect(dB).toBeGreaterThanOrEqual(0);
        expect(dA > 0 && dB > 0).toBe(false);
        for (const [d, final] of [
          [dA, e.placar.A],
          [dB, e.placar.B],
        ]) {
          if (final < 12) expect(VALIDOS).toContain(d);
          else expect(final).toBe(12);
        }
        if (e.estado === 'PARTIDA_ENCERRADA') {
          expect(['A', 'B']).toContain(e.vencedora);
          expect(Math.max(e.placar.A, e.placar.B)).toBe(12);
          esperaOk(jogo.novaPartida(), 'novaPartida');
          partidas++;
        } else {
          expect(Math.max(e.placar.A, e.placar.B)).toBeLessThan(12);
          esperaOk(jogo.proximaMao(), 'proximaMao');
        }
        continue;
      }

      // estado de jogo: escolhe uma ação disponível qualquer e exige que seja aceita
      const opcoes = [];
      for (const j of JOGADORES) for (const a of jogo.acoesDisponiveis(j)) opcoes.push([j, a.tipo]);
      expect(opcoes.length).toBeGreaterThan(0);

      if (e.estado === 'AGUARDANDO_JOGADA') {
        // só o jogador da vez pode jogar
        const quemJoga = opcoes.filter(([, t]) => t === 'JOGAR').map(([j]) => j);
        expect(quemJoga).toEqual([e.mao.vez]);
      }

      // pedidos de aumento com menos frequência, para as mãos chegarem ao fim pelas cartas também
      let [j, tipo] = escolher(opcoes);
      if (tipo === 'PEDIR_AUMENTO' && rng() < 0.7) {
        const jogar = opcoes.find(([, t]) => t === 'JOGAR');
        if (jogar) [j, tipo] = jogar;
      }

      const cartas = e.mao.cartas[j];
      let res;
      switch (tipo) {
        case 'JOGAR':
          res =
            e.mao.tipo === 'ferro'
              ? jogo.jogarCarta(j, Math.floor(rng() * cartas.length))
              : jogo.jogarCarta(j, escolher(cartas));
          break;
        case 'JOGAR_COBERTA':
          res = jogo.jogarCarta(j, escolher(cartas), { coberta: true });
          break;
        case 'PEDIR_AUMENTO':
          res = jogo.pedirAumento(j);
          break;
        case 'ACEITAR':
        case 'CORRER':
        case 'AUMENTAR':
          res = jogo.responder(j, tipo);
          break;
        case 'DECIDIR_ONZE':
          res = jogo.decidirMaoDeOnze(j, rng() < 0.8 ? 'JOGAR' : 'CORRER');
          break;
        default:
          throw new Error(`Ação inesperada em ${e.estado}: ${tipo}`);
      }
      esperaOk(res, `${j} ${tipo} (estado ${e.estado})`);
    }

    expect(maos).toBe(1000);
    expect(partidas).toBeGreaterThan(1);
  });
});
