import { parseBRNumber } from './formatters';

export function calcularRegistroGerador({
  horimetroInicial,
  horimetroFinal,
  litros,
  custo
}) {
  const ini = parseBRNumber(horimetroInicial);
  const fim = parseBRNumber(horimetroFinal);

  const horas = Math.max(0, fim - ini);
  const totalLitros = parseBRNumber(litros);
  const custoTotal = parseBRNumber(custo);

  const consumoMedio = horas > 0 ? totalLitros / horas : 0;
  const custoPorHora = horas > 0 ? custoTotal / horas : 0;
  const custoPorLitro = totalLitros > 0 ? custoTotal / totalLitros : 0;

  return {
    horas,
    litros: totalLitros,
    custo: custoTotal,
    consumoMedio,
    custoPorHora,
    custoPorLitro
  };
}

export function horaParaDecimal(hora) {
  if (!hora) return 0;
  if (typeof hora === 'number') return hora;

  const texto = String(hora).trim();
  const partes = texto.split(':').map(Number);

  if (partes.length === 3) {
    return (partes[0] || 0) + (partes[1] || 0) / 60 + (partes[2] || 0) / 3600;
  }

  if (partes.length === 2) {
    return (partes[0] || 0) + (partes[1] || 0) / 60;
  }

  return parseBRNumber(texto);
}

export function calcularDieselMensal(consumoHoraGMGs, tempoFuncionamento) {
  const horas = horaParaDecimal(tempoFuncionamento);
  const total = parseBRNumber(consumoHoraGMGs) * horas;

  return {
    horas,
    total
  };
}
