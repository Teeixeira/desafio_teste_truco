const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const T = require('./src');

const root = __dirname;
const port = Number(process.env.PORT) || 3002;
const staticFiles = new Map([
  ['/','index.html'],['/index.html','index.html'],['/browser.js','browser.js'],['/styles.css','styles.css'],
]);
const contentTypes = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
let game = null, pendingPlayer = null, awaitingReady = false;

function nextActor() {
  const e=game.obterEstado(), mao=e.mao;
  if(e.estado==='AGUARDANDO_JOGADA') return mao.vez;
  if(e.estado==='AGUARDANDO_RESPOSTA') return T.proximoJogador(mao.pedidoPendente.jogador);
  if(e.estado==='AGUARDANDO_DECISAO_ONZE') return mao.duplaDeOnze==='A'?'J1':'J2';
  return null;
}
function publicState() {
  const e=game.obterEstado();
  return {
    estado:e.estado, placar:e.placar, carteador:e.carteador, vencedora:e.vencedora,
    mao:e.mao?{
      tipo:e.mao.tipo, vira:e.mao.vira, manilha:e.mao.manilha, valor:e.mao.valor,
      pedidoPendente:e.mao.pedidoPendente, vez:e.mao.vez, resultado:e.mao.resultado,
      quantidadeCartas:Object.fromEntries(Object.entries(e.mao.cartas).map(([j,c])=>[j,c.length])),
      rodadas:e.mao.rodadas.map(r=>({abriu:r.abriu, resultado:r.resultado, vencedor:r.vencedor,
        jogadas:r.jogadas.map(g=>({jogador:g.jogador,coberta:g.coberta,carta:g.coberta?null:g.carta}))}))
    }:null,
    proximo:pendingPlayer, aguardandoTroca:awaitingReady
  };
}
function privatePayload(jogador) {
  if(!game) return { erro:'Partida não iniciada.' };
  if(jogador!==pendingPlayer) return { erro:'Este jogador ainda não está na vez.' };
  return { public:publicState(), view:game.visao(jogador), actions:game.acoesDisponiveis(jogador) };
}
function json(res,status,data) {
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(data));
}
async function body(req) {
  let raw=''; for await(const chunk of req) raw+=chunk;
  if(raw.length>1e6) throw new Error('Requisição muito grande');
  return raw?JSON.parse(raw):{};
}
function startGame(options={}) {
  game=T.criarPartida({semente:Date.now(),...options});
  game.distribuir(); pendingPlayer=nextActor(); awaitingReady=true;
}
async function handle(req,res) {
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET' && url.pathname==='/api/status') {
    return json(res,200,game?publicState():{estado:'SEM_PARTIDA'});
  }
  if(req.method==='GET' && url.pathname==='/api/view') {
    const p=privatePayload(url.searchParams.get('player'));
    return json(res,p.erro?409:200,p);
  }
  if(req.method==='POST' && url.pathname==='/api/new') {
    const input=await body(req); startGame({carteadorInicial:input.carteadorInicial,semente:input.semente});
    return json(res,200,{public:publicState()});
  }
  const file=staticFiles.get(url.pathname);
  if(req.method==='GET'&&file){
    try { const content=await fs.readFile(path.join(root,file));res.writeHead(200,{'content-type':contentTypes[path.extname(file)],'cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(content); }
    catch { res.writeHead(500);return res.end('Não foi possível carregar o jogo.'); }
  }
  if(!game) return json(res,409,{erro:'Inicie uma partida primeiro.'});
  if(req.method==='POST' && url.pathname==='/api/ready') {
    const input=await body(req);
    if(!awaitingReady||input.player!==pendingPlayer) return json(res,409,{erro:'Jogador inesperado.'});
    awaitingReady=false; return json(res,200,privatePayload(pendingPlayer));
  }
  if(req.method==='POST' && url.pathname==='/api/next') {
    if(game.obterEstado().estado!=='MAO_ENCERRADA') return json(res,409,{erro:'A mão ainda não terminou.'});
    game.proximaMao(); game.distribuir(); pendingPlayer=nextActor(); awaitingReady=true;
    return json(res,200,{public:publicState()});
  }
  if(req.method==='POST' && url.pathname==='/api/action') {
    const input=await body(req);
    if(awaitingReady||input.player!==pendingPlayer) return json(res,409,{erro:'Aguarde a troca de jogador.'});
    const actor=pendingPlayer, args=input;
    let result;
    switch(input.action){
      case 'play': result=game.jogarCarta(actor,input.index,{coberta:!!input.coberta}); break;
      case 'raise': result=game.pedirAumento(actor); break;
      case 'answer': result=game.responder(actor,input.answer); break;
      case 'eleven': result=game.decidirMaoDeOnze(actor,input.decision); break;
      default: return json(res,400,{erro:'Ação desconhecida.'});
    }
    if(!result||result.ok!==true) return json(res,422,{erro:result?.motivo||'Ação recusada.'});
    pendingPlayer=nextActor(); awaitingReady=!!pendingPlayer;
    return json(res,200,{public:publicState()});
  }
  res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Não encontrado');
}
http.createServer((req,res)=>{handle(req,res).catch(error=>json(res,400,{erro:error.message||'Requisição inválida.'}));})
  .listen(port,'127.0.0.1',()=>console.log(`Truco Paulista disponível em http://127.0.0.1:${port}`));
