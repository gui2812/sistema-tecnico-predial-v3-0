export function parseMedicoes(texto) {
  return String(texto || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const match = linha.match(/^(.+?)\s*[-–]\s*([0-9.,]+)$/);

      if (!match) return null;

      return {
        unidade: match[1].trim(),
        leitura: Number(match[2].replace(/\D/g, ''))
      };
    })
    .filter(Boolean);
}

export function calcularConsumosLocatarios(anteriorTexto, atualTexto, limite = 99999) {
  const anteriores = parseMedicoes(anteriorTexto);
  const atuais = parseMedicoes(atualTexto);

  const mapAnterior = new Map(
    anteriores.map((m) => [m.unidade, m.leitura])
  );

  const linhas = atuais.map((atual) => {
    const temAnterior = mapAnterior.has(atual.unidade);
    const anterior = temAnterior ? mapAnterior.get(atual.unidade) : '';

    if (!temAnterior || atual.leitura === '' || atual.leitura === null || atual.leitura === undefined) {
      return {
        unidade: atual.unidade,
        anterior,
        atual: atual.leitura,
        consumo: '',
        virou: false,
        observacao: 'Leitura anterior não encontrada'
      };
    }

    const virou = atual.leitura < anterior;

    const consumo = virou
      ? (limite - anterior) + atual.leitura
      : atual.leitura - anterior;

    return {
      unidade: atual.unidade,
      anterior,
      atual: atual.leitura,
      consumo,
      virou,
      observacao: virou ? 'Medidor virou' : ''
    };
  });

  const linhasComConsumo = linhas.filter((l) => Number(l.consumo) > 0);

  const total = linhas.reduce((s, l) => s + Number(l.consumo || 0), 0);

  const maior = linhasComConsumo.length
    ? linhasComConsumo.reduce((a, b) => Number(b.consumo) > Number(a.consumo) ? b : a, linhasComConsumo[0])
    : null;

  const menor = linhasComConsumo.length
    ? linhasComConsumo.reduce((a, b) => Number(b.consumo) < Number(a.consumo) ? b : a, linhasComConsumo[0])
    : null;

  return {
    linhas,
    total,
    quantidade: linhas.length,
    maior,
    menor,
    media: linhasComConsumo.length ? total / linhasComConsumo.length : 0
  };
}
