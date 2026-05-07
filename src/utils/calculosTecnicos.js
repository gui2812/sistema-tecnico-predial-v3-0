import { parseBRNumber } from './formatters';

export function calcularFancoil({ kw, horasDia, diasUteis, precoKwh }) {
  const consumo = parseBRNumber(kw) * parseBRNumber(horasDia) * parseBRNumber(diasUteis);
  const custo = consumo * parseBRNumber(precoKwh);
  return { consumo, custo };
}

export function calcularGas({ consumoM3, fator }) {
  const totalKg = parseBRNumber(consumoM3) * parseBRNumber(fator);
  return { totalKg, comumKg: totalKg * 0.05, privativoKg: totalKg * 0.95 };
}
