/**
 * 7. Matriz de rastreabilidade — garante que os 166 casos do documento (14 módulos)
 * existem nesta suíte, cada um com o seu ID no nome do teste.
 */
const fs = require('fs');
const path = require('path');

const MODULOS = {
  BAR: 6,
  FOR: 8,
  MAN: 18,
  DIS: 11,
  ROD: 13,
  MAO: 17,
  COB: 8,
  TRU: 26,
  ONZ: 15,
  FER: 9,
  PLA: 8,
  INV: 15,
  VIS: 7,
  E2E: 5,
};

const ESPERADOS = Object.entries(MODULOS).flatMap(([mod, n]) =>
  Array.from({ length: n }, (_, i) => `TC-${mod}-${String(i + 1).padStart(2, '0')}`),
);

function arquivosDeTeste(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return arquivosDeTeste(p);
    return d.name.endsWith('.test.js') && p !== __filename ? [p] : [];
  });
}

describe('7. Matriz de rastreabilidade', () => {
  const encontrados = new Set();
  for (const arq of arquivosDeTeste(__dirname)) {
    const texto = fs.readFileSync(arq, 'utf8');
    for (const m of texto.matchAll(/TC-[A-Z0-9]{3}-\d{2}/g)) encontrados.add(m[0]);
  }

  test('o documento tem 166 casos em 14 módulos', () => {
    expect(Object.keys(MODULOS)).toHaveLength(14);
    expect(ESPERADOS).toHaveLength(166);
  });

  test('todos os 166 casos do documento estão implementados', () => {
    const faltando = ESPERADOS.filter((id) => !encontrados.has(id));
    expect(faltando).toEqual([]);
  });

  test('a suíte não cita IDs que não existem no documento', () => {
    const desconhecidos = [...encontrados].filter((id) => !ESPERADOS.includes(id));
    expect(desconhecidos).toEqual([]);
  });
});
