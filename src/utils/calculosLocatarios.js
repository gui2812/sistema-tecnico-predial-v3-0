export function parseMedicoes(texto) {
  return String(texto || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const match = linha.match(/^(.+?)\s*[-–]\s*([0-9.,]+)$/);
      if (!match) return null;
      return { unidade: match[1].trim(), leitura: Number(match[2].replace(/\D/g, '')) };
    })
    .filter(Boolean);
}

export function calcularConsumosLocatarios(anteriorTexto, atualTexto, limite = 100000) {
  const anteriores = parseMedicoes(anteriorTexto);
  const atuais = parseMedicoes(atualTexto);
  const mapAnterior = new Map(anteriores.map((m) => [m.unidade, m.leitura]));
  const linhas = atuais.map((atual) => {
    const anterior = mapAnterior.get(atual.unidade) ?? 0;
    const virou = atual.leitura < anterior;
    const consumo = virou ? limite - anterior + atual.leitura : atual.leitura - anterior;
    return { unidade: atual.unidade, anterior, atual: atual.leitura, consumo, virou, observacao: virou ? 'Medidor virou' : '' };
  });
  const total = linhas.reduce((s, l) => s + l.consumo, 0);
  const maior = linhas.length ? linhas.reduce((a, b) => b.consumo > a.consumo ? b : a, linhas[0]) : null;
  const menor = linhas.length ? linhas.reduce((a, b) => b.consumo < a.consumo ? b : a, linhas[0]) : null;
  return { linhas, total, quantidade: linhas.length, maior, menor, media: linhas.length ? total / linhas.length : 0 };
}
