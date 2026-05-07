import { parseBRNumber } from './formatters';

export function calcularRegistroGerador({ horimetroInicial, horimetroFinal, consumoHora, valorDiesel }) {
  const ini = parseBRNumber(horimetroInicial);
  const fim = parseBRNumber(horimetroFinal);
  const horas = Math.max(0, fim - ini);
  const litros = horas * parseBRNumber(consumoHora);
  const custo = litros * parseBRNumber(valorDiesel);
  return { horas, litros, custo };
}

export function horaParaDecimal(hora) {
  if (!hora) return 0;
  if (typeof hora === 'number') return hora;
  const texto = String(hora).trim();
  const partes = texto.split(':').map(Number);
  if (partes.length === 3) return (partes[0] || 0) + (partes[1] || 0) / 60 + (partes[2] || 0) / 3600;
  if (partes.length === 2) return (partes[0] || 0) + (partes[1] || 0) / 60;
  return parseBRNumber(texto);
}

export function calcularDieselMensal(consumoHoraGMGs, tempoFuncionamento) {
  const horas = horaParaDecimal(tempoFuncionamento);
  const total = parseBRNumber(consumoHoraGMGs) * horas;
  return { horas, total };
}
