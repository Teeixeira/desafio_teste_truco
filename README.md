# Truco Paulista — duas duplas

Jogo local de Truco Paulista para quatro pessoas: Dupla A (J1 e J3) contra Dupla B (J2 e J4). O motor JavaScript segue o contrato em [CONTRATO.md](CONTRATO.md); a suíte existente serve como especificação executável das regras e dos casos de teste.

## Participantes do grupo

| Nome | RA |
|---|---|
| Leonardo Teixeira de Carvalho | 24159859-2 |
| Matheus Eduardo Polizelli | 24129411-2 |


## Executar os testes

Requer Node.js e npm. Na pasta do projeto:

```sh
npm install
npm test
```

A suíte contém 166 IDs de casos do documento, distribuídos por 14 módulos, além de testes adicionais de contrato, máquina de estados e propriedades.

## Abrir no navegador

```sh
npm start
```

Abra [http://127.0.0.1:3002](http://127.0.0.1:3002). A interface funciona como jogo presencial no mesmo dispositivo: cada jogada pede a troca para o próximo jogador antes de revelar a mão dele. O placar, a vira e as rodadas permanecem visíveis. É possível jogar cartas abertas ou cobertas, pedir truco, responder à aposta, decidir mão de onze e distribuir as mãos seguintes.

## Arquivos principais

- `src/index.js`: motor do jogo e funções puras testadas.
- `tests/`: casos de unidade, regras, máquina de estados, visibilidade, rastreabilidade e partidas completas.
- `server.js`, `index.html`, `browser.js`, `styles.css`: servidor local e interface de usuário.
- `referencia/index.js`: implementação de referência preservada para comparação (`npm run test:referencia`).

As equipes, hierarquia das cartas, manilhas, mão de onze, mão de ferro, cobertas, pedidos de truco, pontuação e condições de encerramento estão detalhados em `CONTRATO.md` e exercitados nos testes.
