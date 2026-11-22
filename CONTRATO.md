# Truco Paulista (4 jogadores) — Contrato de API exigido pela suíte de testes

Esta suíte é uma **especificação executável** do documento *"Truco Paulista (4 jogadores) —
Especificação e Casos de Teste"*. Ela não contém o jogo: contém os 166 casos de teste do
documento (TC-BAR-01 … TC-E2E-05) e mais alguns testes de contrato, de máquina de estados e de
propriedade (fuzz). Para que a suíte passe, a implementação precisa expor a API descrita aqui.

## Como rodar

```bash
npm install
npm test
```

Por padrão os testes carregam a implementação de `./src` (ou seja, `src/index.js`). Para apontar
para outro módulo, use a variável `TRUCO_IMPL`:

```bash
TRUCO_IMPL=./caminho/do/meu/jogo npm test
```

O único ponto que importa a implementação é `tests/support/impl.js`.

## Organização

| Arquivo | Módulo do documento |
|---|---|
| `tests/unit/baralho.test.js` | 6.1 Baralho (TC-BAR) |
| `tests/unit/forca.test.js` | 6.2 Força das cartas comuns (TC-FOR) + R-08 |
| `tests/unit/manilha.test.js` | 6.3 Vira e manilhas (TC-MAN) |
| `tests/unit/funcoes-puras.test.js` | 5.3 Funções puras |
| `tests/jogo/distribuicao.test.js` | 6.4 Distribuição, carteador e ordem (TC-DIS) |
| `tests/jogo/rodada.test.js` | 6.5 Vencedor da rodada (TC-ROD) |
| `tests/jogo/mao.test.js` | 6.6 Resultado da mão (TC-MAO) |
| `tests/jogo/coberta.test.js` | 6.7 Carta coberta (TC-COB) |
| `tests/jogo/truco.test.js` | 6.8 Truco e aumentos (TC-TRU) |
| `tests/jogo/mao-de-onze.test.js` | 6.9 Mão de onze (TC-ONZ) |
| `tests/jogo/mao-de-ferro.test.js` | 6.10 Mão de ferro (TC-FER) |
| `tests/jogo/placar.test.js` | 6.11 Placar e fim de partida (TC-PLA) |
| `tests/jogo/invalidas.test.js` | 6.12 Ações inválidas (TC-INV) |
| `tests/jogo/visibilidade.test.js` | 6.13 Visibilidade (TC-VIS) |
| `tests/jogo/maquina-estados.test.js` | 5.4 Estados da partida |
| `tests/e2e/cenarios.test.js` | 6.14 Cenários ponta a ponta (TC-E2E) |
| `tests/rastreabilidade.test.js` | 7. Matriz — garante que os 166 IDs existem na suíte |

Todo teste tem o ID do documento no nome (`TC-TRU-07 — Correr do nove`), então
`npx jest -t "TC-TRU"` roda só um módulo.

---

## 1. Tipos básicos

| Tipo | Representação |
|---|---|
| `Valor` | string: `'4' '5' '6' '7' 'Q' 'J' 'K' 'A' '2' '3'` |
| `Naipe` | string: `'♦'` (Ouros), `'♠'` (Espadas), `'♥'` (Copas), `'♣'` (Paus) |
| `Carta` | objeto `{ valor: Valor, naipe: Naipe }` (campos extras são tolerados) |
| `Jogador` | `'J1' 'J2' 'J3' 'J4'` |
| `Dupla` | `'A'` (J1 + J3) ou `'B'` (J2 + J4) |
| `ResultadoRodada` | `'A' 'B' 'E'` |

Os testes comparam cartas pela chave `valor + naipe` (ex.: `'7♦'`), então a implementação pode
acrescentar campos (id, imagem…) sem quebrar nada.

## 2. Exportações do módulo

```js
module.exports = {
  // constantes
  SEQ,          // ['4','5','6','7','Q','J','K','A','2','3']
  NAIPES,       // ['♦','♠','♥','♣']  (do mais fraco ao mais forte como manilha)

  // funções puras (seção 5.3)
  criarBaralho,     // () => Carta[40]
  embaralhar,       // (baralho, semente?) => Carta[]   NÃO altera o array recebido
  manilhaDe,        // (vira: Carta) => Valor
  forca,            // (carta, manilha: Valor, coberta = false) => number
  proximoValor,     // (1|3|6|9|12) => 3|6|9|12|null
  valorAoCorrer,    // (valorAtual) => valorAtual
  nomePedido,       // (valorAtual) => 'Truco'|'Seis'|'Nove'|'Doze'|null
  vencedorRodada,   // (jogadas, manilha) => { resultado, vencedor }
  resultadoMao,     // (resultados[]) => 'A'|'B'|'NINGUEM'|'EM_ANDAMENTO'
  duplaDe,          // (jogador) => 'A'|'B'
  proximoJogador,   // (jogador) => jogador   (J1→J2→J3→J4→J1)

  // motor do jogo
  criarPartida,     // (opcoes?) => Jogo
};
```

### Detalhes das funções puras

- `embaralhar(baralho, semente)`: mesma semente ⇒ mesma ordem; sementes diferentes ⇒ ordens
  diferentes (TC-BAR-05). Sem semente pode usar `Math.random`.
- `forca` (R-08): carta comum = índice em `SEQ` (4 = 0 … 3 = 9); manilha = 10 (♦), 11 (♠),
  12 (♥), 13 (♣); coberta = −1.
- `vencedorRodada(jogadas, manilha)`: `jogadas` é `[{ jogador, carta, coberta? }]` **na ordem em
  que foram jogadas**. Retorna `{ resultado: 'A'|'B'|'E', vencedor: Jogador|null }`
  (`vencedor` é `null` no empate; entre parceiros vence o primeiro a jogar a maior).
- `resultadoMao(r)`: exatamente o pseudocódigo da seção 5.3; `'NINGUEM'` para E, E, E.

## 3. `criarPartida(opcoes?)`

| Opção | Tipo | Padrão | Uso |
|---|---|---|---|
| `jogadores` | `string[]` | `['J1','J2','J3','J4']` | Precisa ser exatamente esses 4 (R-01) |
| `duplas` | `{ A: Jogador[], B: Jogador[] }` | `{A:['J1','J3'],B:['J2','J4']}` | Qualquer outra formação é inválida (TC-INV-10) |
| `carteadorInicial` | `Jogador` | sorteado pela semente | D-10 |
| `semente` | `number` | aleatória | D-10: embaralhamento e sorteio reproduzíveis |
| `baralhos` | `Carta[][]` | — | D-10 (`baralhoFixo`): a *i*-ésima mão da partida (a partir de 0) usa `baralhos[i]` **sem embaralhar**; esgotada a lista, volta a embaralhar com a semente |
| `placarInicial` | `{ A: number, B: number }` | `{A:0,B:0}` | Gancho de teste para cenários como "placar 11×5" |

Configuração inválida (`jogadores` com 3 ou 5, duplas lado a lado, …) ⇒ **lança `Error`** com
mensagem não vazia. A partida criada começa em `AGUARDANDO_DISTRIBUICAO`.

**Ordem de um baralho fixo** (TC-DIS-03/04): `baralho[0]` é o topo. Na distribuição, a carta *k*
(k = 0…11) vai para o jogador `(seguinte ao carteador + k) mod 4`, então cada jogador recebe as
posições k, k+4, k+8; `baralho[12]` é a vira; as 27 restantes ficam no monte. **As cartas de cada
jogador ficam na ordem em que foram recebidas** (e, ao jogar, as restantes mantêm a ordem
relativa) — a mão de ferro escolhe cartas por posição.

## 4. Objeto `Jogo`

Toda ação devolve um `Resultado`:

```js
{ ok: true }                       // aceita (campos extras permitidos)
{ ok: false, motivo: 'Não é sua vez' }   // recusada
```

Ações recusadas (R-38) **não lançam exceção**, trazem `motivo` não vazio e **não alteram nada**:
`obterEstado()` antes e depois deve ser `toEqual`. Duas mensagens são verificadas pelo texto
(case-insensitive): jogar fora da vez deve conter **"não é sua vez"** e jogar carta que não
está na mão deve conter **"não está na sua mão"**.

### Ações

| Método | Válida quando |
|---|---|
| `distribuir()` | estado `AGUARDANDO_DISTRIBUICAO` |
| `proximaMao()` | estado `MAO_ENCERRADA`; avança o carteador e vai a `AGUARDANDO_DISTRIBUICAO` com o monte recomposto (40 cartas) |
| `jogarCarta(jogador, carta, { coberta } = {})` | `AGUARDANDO_JOGADA`, vez do jogador, carta na mão dele; coberta só da 2ª rodada em diante e fora da mão de ferro. `carta` pode ser um objeto `Carta` **ou um índice (0-based)** da posição na mão — o índice é obrigatório na mão de ferro, em que o jogador não vê as cartas |
| `pedirAumento(jogador)` | `AGUARDANDO_JOGADA`, vez do jogador, mão normal, valor < 12 e a dupla dele tem o direito de aumentar |
| `responder(jogador, 'ACEITAR'│'CORRER'│'AUMENTAR')` | `AGUARDANDO_RESPOSTA`, jogador da dupla adversária a quem pediu; `AUMENTAR` só se o valor proposto < 12 |
| `decidirMaoDeOnze(jogador, 'JOGAR'│'CORRER')` | `AGUARDANDO_DECISAO_ONZE`, jogador da dupla com 11 |
| `novaPartida(opcoes?)` | `PARTIDA_ENCERRADA`; aceita `carteadorInicial`, `semente`, `baralhos`; placar volta a 0×0 |

Regras de transição relevantes:

- Pedir aumento **não consome a vez**: depois de aceito, o mesmo jogador joga.
- Responder `AUMENTAR` aceita o valor pedido e abre novo pedido (o `jogador` do pedido passa a
  ser quem aumentou).
- Ao aceitar, `direitoDeAumentar` passa para a dupla que aceitou.
- Fim de mão: se alguma dupla chegou a 12 ⇒ `PARTIDA_ENCERRADA` (placar limitado a 12 e
  `vencedora` preenchida); senão ⇒ `MAO_ENCERRADA`.
- A mão encerrada continua acessível em `obterEstado().mao` até `proximaMao()`.

### Consultas

#### `obterEstado()` — visão completa (do "juiz"), sempre uma **cópia**

```js
{
  estado: 'AGUARDANDO_DISTRIBUICAO' | 'AGUARDANDO_DECISAO_ONZE' | 'AGUARDANDO_JOGADA'
        | 'AGUARDANDO_RESPOSTA' | 'MAO_ENCERRADA' | 'PARTIDA_ENCERRADA',
  placar: { A: number, B: number },
  carteador: Jogador,
  vencedora: 'A' | 'B' | null,
  monte: Carta[],          // 40 em AGUARDANDO_DISTRIBUICAO; 27 depois de distribuir
  mao: null | {            // null em AGUARDANDO_DISTRIBUICAO
    tipo: 'normal' | 'onze' | 'ferro',
    duplaDeOnze: 'A' | 'B' | null,
    vira: Carta,
    manilha: Valor,
    valor: 1 | 3 | 6 | 9 | 12,
    pedidoPendente: null | { dupla: Dupla, jogador: Jogador, valorProposto: number },
    direitoDeAumentar: 'A' | 'B' | 'QUALQUER' | null,
    vez: Jogador | null,
    cartas: { J1: Carta[], J2: Carta[], J3: Carta[], J4: Carta[] },  // cartas ainda na mão
    rodadas: [{
      abriu: Jogador,
      jogadas: [{ jogador: Jogador, carta: Carta, coberta: boolean }],
      resultado: 'A' | 'B' | 'E' | null,   // null enquanto a rodada não tem 4 cartas
      vencedor: Jogador | null,
    }],
    resultado: null | 'A' | 'B' | 'NINGUEM',
  },
}
```

`rodadas` contém só rodadas já iniciadas (a primeira aparece ao distribuir ou na primeira
jogada — os testes aceitam as duas formas e ignoram rodadas sem jogadas).

#### `visao(jogador)` — o que aquele jogador pode ver (R-12)

```js
{
  jogador, estado, placar, carteador, vez, valor, tipo, vira, manilha,
  minhasCartas: (Carta | null)[],      // na mão de ferro: um null por carta (oculta)
  cartasDoParceiro: Carta[] | null,    // só na mão de onze, para a dupla com 11
  quantidadeCartas: { J1, J2, J3, J4 },
  rodadas: [{ abriu, resultado, vencedor,
              jogadas: [{ jogador, coberta, carta: Carta | null }] }],  // coberta ⇒ carta null
  pedidoPendente: null | { dupla, jogador, valorProposto },
}
```

Os testes de visibilidade fazem uma **varredura profunda** da visão: qualquer objeto com
`valor` e `naipe` encontrado em qualquer campo conta como carta visível. Portanto a visão não
pode conter, em lugar nenhum, cartas que o jogador não deveria ver.

#### `acoesDisponiveis(jogador)` — `{ tipo, rotulo? }[]`

| `tipo` | Quando aparece |
|---|---|
| `JOGAR` | é a vez do jogador em `AGUARDANDO_JOGADA` |
| `JOGAR_COBERTA` | idem, a partir da 2ª rodada e fora da mão de ferro |
| `PEDIR_AUMENTO` | `pedirAumento` seria aceito; `rotulo` = `'Truco'`, `'Seis'`, `'Nove'` ou `'Doze'` |
| `ACEITAR`, `CORRER` | jogador pode responder ao pedido pendente |
| `AUMENTAR` | idem, se o proposto < 12; `rotulo` = nome do próximo degrau (ex.: `'Seis'`) |
| `DECIDIR_ONZE` | jogador da dupla com 11 em `AGUARDANDO_DECISAO_ONZE` |
| `NOVA_PARTIDA` | qualquer jogador em `PARTIDA_ENCERRADA` (única ação disponível) |

Jogador inexistente ⇒ `[]`. O teste de propriedade (TC-PLA-08) executa ações sorteadas desta
lista e exige que **toda ação listada seja aceita**.

---

## 5. Decisões de variantes testadas (seção 4 do documento)

D-01 sentido J1→J2→J3→J4 · D-02 após empate abre quem abriu a rodada empatada · D-03 coberta a
partir da 2ª rodada; só cobertas = empate · D-04 três empates = ninguém pontua · D-05 primeira
resposta da dupla vale · D-06 sem truco na mão de onze, primeira decisão vale · D-07 mão de ferro
vale 1, vira visível, empate total redistribui · D-08 placar limitado a 12 · D-09 partida única
· D-10 baralho/semente/carteador injetáveis.
