/**
 * Implementação de REFERÊNCIA do Truco Paulista — existe só para provar que a suíte de testes
 * é consistente (todos os testes passam contra ela). Não é o jogo final: o jogo de verdade
 * deve ficar em src/index.js, seguindo o CONTRATO.md.
 *
 * Rodar a suíte contra esta referência:  npm run test:referencia
 */
const SEQ = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const NAIPES = ['♦', '♠', '♥', '♣'];
const JOG = ['J1', 'J2', 'J3', 'J4'];

const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const duplaDe = (j) => (j === 'J1' || j === 'J3' ? 'A' : 'B');
const proximoJogador = (j) => JOG[(JOG.indexOf(j) + 1) % 4];
const parceiro = (j) => JOG[(JOG.indexOf(j) + 2) % 4];
const outra = (d) => (d === 'A' ? 'B' : 'A');
const k = (c) => `${c.valor}${c.naipe}`;

function mulberry32(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function criarBaralho() {
  const r = [];
  for (const valor of SEQ) for (const naipe of NAIPES) r.push({ valor, naipe });
  return r;
}
function embaralhar(b, semente) {
  const rnd = semente === undefined ? Math.random : mulberry32(semente);
  const r = b.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
const manilhaDe = (v) => SEQ[(SEQ.indexOf(v.valor) + 1) % 10];
function forca(c, m, cob = false) {
  if (cob) return -1;
  if (c.valor === m) return 10 + NAIPES.indexOf(c.naipe);
  return SEQ.indexOf(c.valor);
}
const proximoValor = (v) => ({ 1: 3, 3: 6, 6: 9, 9: 12 }[v] ?? null);
const valorAoCorrer = (v) => v;
const nomePedido = (v) => ({ 1: 'Truco', 3: 'Seis', 6: 'Nove', 9: 'Doze' }[v] ?? null);

function vencedorRodada(jogadas, manilha) {
  const fs = jogadas.map((j) => forca(j.carta, manilha, !!j.coberta));
  const max = Math.max(...fs);
  const duplas = new Set(jogadas.filter((_, i) => fs[i] === max).map((j) => duplaDe(j.jogador)));
  if (max === -1 || duplas.size === 2) return { resultado: 'E', vencedor: null };
  const i = fs.indexOf(max);
  return { resultado: duplaDe(jogadas[i].jogador), vencedor: jogadas[i].jogador };
}

function resultadoMao(r) {
  if (r.length >= 2 && r[0] === r[1] && r[0] !== 'E') return r[0];
  if (r.length >= 2 && r[0] !== 'E' && r[1] === 'E') return r[0];
  if (r.length >= 2 && r[0] === 'E' && r[1] !== 'E') return r[1];
  if (r.length === 3) {
    if (r[0] === 'E' && r[1] === 'E') return r[2] !== 'E' ? r[2] : 'NINGUEM';
    if (r[2] === 'E') return r[0];
    return r[2];
  }
  return 'EM_ANDAMENTO';
}

const recusa = (motivo) => ({ ok: false, motivo });
const OK = () => ({ ok: true });

function criarPartida(op = {}) {
  if (op.jogadores !== undefined) {
    const j = op.jogadores;
    if (!Array.isArray(j) || j.length !== 4 || [...j].sort().join() !== JOG.join())
      throw new Error('A partida exige exatamente 4 jogadores: J1, J2, J3, J4');
  }
  if (op.duplas !== undefined) {
    const d = op.duplas;
    if (!d || [...(d.A || [])].sort().join() !== 'J1,J3' || [...(d.B || [])].sort().join() !== 'J2,J4')
      throw new Error('As duplas são sempre J1 + J3 e J2 + J4');
  }
  return new Jogo(op);
}

class Jogo {
  constructor(op) {
    this._iniciar(op);
  }
  _iniciar(op) {
    this.rng = mulberry32(op.semente ?? Math.floor(Math.random() * 2 ** 32));
    this.baralhos = op.baralhos || [];
    this.s = {
      estado: 'AGUARDANDO_DISTRIBUICAO',
      placar: op.placarInicial ? { A: op.placarInicial.A, B: op.placarInicial.B } : { A: 0, B: 0 },
      carteador: op.carteadorInicial || JOG[Math.floor(this.rng() * 4)],
      vencedora: null,
      monte: [],
      mao: null,
    };
    this.numeroMao = 0;
    this.s.monte = this._monte();
  }
  _monte() {
    const b = this.baralhos[this.numeroMao];
    if (b) return clone(b);
    return embaralhar(criarBaralho(), Math.floor(this.rng() * 2 ** 32));
  }
  obterEstado() {
    return clone(this.s);
  }
  _valido(j) {
    return JOG.includes(j);
  }
  distribuir() {
    if (this.s.estado !== 'AGUARDANDO_DISTRIBUICAO') return recusa('Não é hora de distribuir');
    const m = this.s.monte;
    const cartas = { J1: [], J2: [], J3: [], J4: [] };
    let j = proximoJogador(this.s.carteador);
    for (let i = 0; i < 12; i++) {
      cartas[j].push(m[i]);
      j = proximoJogador(j);
    }
    const vira = m[12];
    this.s.monte = m.slice(13);
    const { A, B } = this.s.placar;
    const tipo = A === 11 && B === 11 ? 'ferro' : A === 11 || B === 11 ? 'onze' : 'normal';
    this.s.mao = {
      tipo,
      duplaDeOnze: tipo === 'onze' ? (A === 11 ? 'A' : 'B') : null,
      vira,
      manilha: manilhaDe(vira),
      valor: 1,
      pedidoPendente: null,
      direitoDeAumentar: tipo === 'normal' ? 'QUALQUER' : null,
      vez: proximoJogador(this.s.carteador),
      cartas,
      rodadas: [],
      resultado: null,
    };
    this.numeroMao++;
    this.s.estado = tipo === 'onze' ? 'AGUARDANDO_DECISAO_ONZE' : 'AGUARDANDO_JOGADA';
    return OK();
  }
  _completas() {
    return this.s.mao.rodadas.filter((r) => r.resultado !== null).length;
  }
  _finalizar(res, pontos) {
    const mao = this.s.mao;
    mao.resultado = res;
    mao.vez = null;
    mao.pedidoPendente = null;
    if (res === 'A' || res === 'B') this.s.placar[res] = Math.min(12, this.s.placar[res] + pontos);
    if (this.s.placar.A >= 12 || this.s.placar.B >= 12) {
      this.s.estado = 'PARTIDA_ENCERRADA';
      this.s.vencedora = this.s.placar.A >= 12 ? 'A' : 'B';
    } else this.s.estado = 'MAO_ENCERRADA';
  }
  jogarCarta(j, carta, opcoes = {}) {
    if (!this._valido(j)) return recusa('Jogador inexistente');
    if (this.s.estado !== 'AGUARDANDO_JOGADA') return recusa('Não é possível jogar carta agora');
    const mao = this.s.mao;
    if (mao.vez !== j) return recusa('Não é sua vez');
    const minhas = mao.cartas[j];
    let idx = -1;
    if (typeof carta === 'number') {
      if (!Number.isInteger(carta) || carta < 0 || carta >= minhas.length) return recusa('Posição de carta inválida');
      idx = carta;
    } else if (carta && typeof carta === 'object') {
      if (!SEQ.includes(carta.valor) || !NAIPES.includes(carta.naipe)) return recusa('Carta inexistente');
      idx = minhas.findIndex((c) => k(c) === k(carta));
      if (idx < 0) return recusa('Carta não está na sua mão');
    } else return recusa('Carta inválida');
    const coberta = !!(opcoes && opcoes.coberta);
    if (coberta && mao.tipo === 'ferro') return recusa('Carta coberta proibida na mão de ferro');
    if (coberta && this._completas() === 0) return recusa('Carta coberta proibida na 1ª rodada');

    let rod = mao.rodadas[mao.rodadas.length - 1];
    if (!rod || rod.resultado !== null) {
      rod = { abriu: j, jogadas: [], resultado: null, vencedor: null };
      mao.rodadas.push(rod);
    }
    const [c] = minhas.splice(idx, 1);
    rod.jogadas.push({ jogador: j, carta: c, coberta });
    if (rod.jogadas.length < 4) {
      mao.vez = proximoJogador(j);
      return OK();
    }
    const v = vencedorRodada(rod.jogadas, mao.manilha);
    rod.resultado = v.resultado;
    rod.vencedor = v.vencedor;
    const r = resultadoMao(mao.rodadas.map((x) => x.resultado));
    if (r !== 'EM_ANDAMENTO') this._finalizar(r, mao.valor);
    else mao.vez = v.vencedor || rod.abriu;
    return OK();
  }
  _podePedir(j) {
    const mao = this.s.mao;
    return (
      this.s.estado === 'AGUARDANDO_JOGADA' &&
      mao.vez === j &&
      mao.tipo === 'normal' &&
      mao.valor < 12 &&
      (mao.direitoDeAumentar === 'QUALQUER' || mao.direitoDeAumentar === duplaDe(j))
    );
  }
  pedirAumento(j) {
    if (!this._valido(j)) return recusa('Jogador inexistente');
    if (this.s.estado !== 'AGUARDANDO_JOGADA') return recusa('Não é possível pedir aumento agora');
    const mao = this.s.mao;
    if (mao.vez !== j) return recusa('Não é sua vez');
    if (mao.tipo !== 'normal') return recusa('Não há truco nesta mão');
    if (mao.valor >= 12) return recusa('Não existe aumento além de 12');
    if (!this._podePedir(j)) return recusa('O direito de aumentar é da outra dupla');
    mao.pedidoPendente = { dupla: duplaDe(j), jogador: j, valorProposto: proximoValor(mao.valor) };
    this.s.estado = 'AGUARDANDO_RESPOSTA';
    return OK();
  }
  responder(j, r) {
    if (!this._valido(j)) return recusa('Jogador inexistente');
    if (this.s.estado !== 'AGUARDANDO_RESPOSTA') return recusa('Não há pedido para responder');
    const mao = this.s.mao;
    const p = mao.pedidoPendente;
    if (duplaDe(j) === p.dupla) return recusa('Só a dupla adversária responde');
    if (r === 'ACEITAR') {
      mao.valor = p.valorProposto;
      mao.direitoDeAumentar = duplaDe(j);
      mao.pedidoPendente = null;
      this.s.estado = 'AGUARDANDO_JOGADA';
      return OK();
    }
    if (r === 'CORRER') {
      this._finalizar(p.dupla, valorAoCorrer(mao.valor));
      return OK();
    }
    if (r === 'AUMENTAR') {
      if (p.valorProposto >= 12) return recusa('Não existe aumento além de 12');
      mao.valor = p.valorProposto;
      mao.direitoDeAumentar = duplaDe(j);
      mao.pedidoPendente = { dupla: duplaDe(j), jogador: j, valorProposto: proximoValor(p.valorProposto) };
      return OK();
    }
    return recusa('Resposta inválida');
  }
  decidirMaoDeOnze(j, d) {
    if (!this._valido(j)) return recusa('Jogador inexistente');
    if (this.s.estado !== 'AGUARDANDO_DECISAO_ONZE') return recusa('Não há decisão de mão de onze pendente');
    const mao = this.s.mao;
    if (duplaDe(j) !== mao.duplaDeOnze) return recusa('Só a dupla com 11 decide');
    if (d === 'JOGAR') {
      mao.valor = 3;
      this.s.estado = 'AGUARDANDO_JOGADA';
      return OK();
    }
    if (d === 'CORRER') {
      this._finalizar(outra(mao.duplaDeOnze), 1);
      return OK();
    }
    return recusa('Decisão inválida');
  }
  proximaMao() {
    if (this.s.estado !== 'MAO_ENCERRADA') return recusa('A mão não terminou');
    this.s.carteador = proximoJogador(this.s.carteador);
    this.s.mao = null;
    this.s.monte = this._monte();
    this.s.estado = 'AGUARDANDO_DISTRIBUICAO';
    return OK();
  }
  novaPartida(op = {}) {
    if (this.s.estado !== 'PARTIDA_ENCERRADA') return recusa('A partida ainda não terminou');
    this._iniciar({ semente: op.semente ?? Math.floor(this.rng() * 2 ** 32), ...op, placarInicial: undefined });
    return OK();
  }
  visao(j) {
    if (!this._valido(j)) return null;
    const mao = this.s.mao;
    const base = {
      jogador: j,
      estado: this.s.estado,
      placar: clone(this.s.placar),
      carteador: this.s.carteador,
      vez: mao ? mao.vez : null,
      valor: mao ? mao.valor : null,
      tipo: mao ? mao.tipo : null,
      vira: mao ? clone(mao.vira) : null,
      manilha: mao ? mao.manilha : null,
      minhasCartas: [],
      cartasDoParceiro: null,
      quantidadeCartas: { J1: 0, J2: 0, J3: 0, J4: 0 },
      rodadas: [],
      pedidoPendente: mao ? clone(mao.pedidoPendente) : null,
    };
    if (!mao) return base;
    base.minhasCartas = mao.tipo === 'ferro' ? mao.cartas[j].map(() => null) : clone(mao.cartas[j]);
    if (mao.tipo === 'onze' && duplaDe(j) === mao.duplaDeOnze) base.cartasDoParceiro = clone(mao.cartas[parceiro(j)]);
    for (const x of JOG) base.quantidadeCartas[x] = mao.cartas[x].length;
    base.rodadas = mao.rodadas.map((r) => ({
      abriu: r.abriu,
      resultado: r.resultado,
      vencedor: r.vencedor,
      jogadas: r.jogadas.map((g) => ({ jogador: g.jogador, coberta: g.coberta, carta: g.coberta ? null : clone(g.carta) })),
    }));
    return base;
  }
  acoesDisponiveis(j) {
    if (!this._valido(j)) return [];
    const e = this.s.estado;
    const mao = this.s.mao;
    if (e === 'PARTIDA_ENCERRADA') return [{ tipo: 'NOVA_PARTIDA' }];
    if (e === 'AGUARDANDO_DECISAO_ONZE')
      return duplaDe(j) === mao.duplaDeOnze ? [{ tipo: 'DECIDIR_ONZE' }] : [];
    if (e === 'AGUARDANDO_JOGADA' && mao.vez === j) {
      const r = [{ tipo: 'JOGAR' }];
      if (mao.tipo !== 'ferro' && this._completas() > 0) r.push({ tipo: 'JOGAR_COBERTA' });
      if (this._podePedir(j)) r.push({ tipo: 'PEDIR_AUMENTO', rotulo: nomePedido(mao.valor) });
      return r;
    }
    if (e === 'AGUARDANDO_RESPOSTA' && duplaDe(j) !== mao.pedidoPendente.dupla) {
      const r = [{ tipo: 'ACEITAR' }, { tipo: 'CORRER' }];
      if (mao.pedidoPendente.valorProposto < 12)
        r.push({ tipo: 'AUMENTAR', rotulo: nomePedido(mao.pedidoPendente.valorProposto) });
      return r;
    }
    return [];
  }
}

module.exports = {
  SEQ,
  NAIPES,
  criarBaralho,
  embaralhar,
  manilhaDe,
  forca,
  proximoValor,
  valorAoCorrer,
  nomePedido,
  vencedorRodada,
  resultadoMao,
  duplaDe,
  proximoJogador,
  criarPartida,
};
