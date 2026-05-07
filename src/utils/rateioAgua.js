import { brl, num, parseBRNumber } from './formatters';

export function formatarListaComE(itens = []) {
  const limpos = itens.map((i) => String(i || '').trim()).filter(Boolean);
  if (limpos.length === 0) return '';
  if (limpos.length === 1) return limpos[0];
  return `${limpos.slice(0, -1).join(', ')} e ${limpos[limpos.length - 1]}`;
}

export function calcularRateioAgua(form = {}) {
  const valorPoco1 = parseBRNumber(form.valorPoco1);
  const valorPoco2 = parseBRNumber(form.valorPoco2);
  const valorSabesp = parseBRNumber(form.valorSabesp);
  const valorTotalManual = parseBRNumber(form.valorTotal);
  const valorTotalCalculado = valorPoco1 + valorPoco2 + valorSabesp;
  const valorTotal = valorTotalManual || valorTotalCalculado;

  const consumoPoco1 = parseBRNumber(form.consumoPoco1);
  const consumoPoco2 = parseBRNumber(form.consumoPoco2);
  const consumoSabesp = parseBRNumber(form.consumoSabesp);
  const consumoTotalManual = parseBRNumber(form.consumoTotal);
  const consumoTotalCalculado = consumoPoco1 + consumoPoco2 + consumoSabesp;
  const consumoTotal = consumoTotalManual || consumoTotalCalculado;
  const tarifa = consumoTotal > 0 ? valorTotal / consumoTotal : 0;

  return { valorPoco1, valorPoco2, valorSabesp, valorTotal, valorTotalCalculado, consumoPoco1, consumoPoco2, consumoSabesp, consumoTotal, consumoTotalCalculado, tarifa };
}

export function gerarEmailRateioAgua(form = {}) {
  const calc = calcularRateioAgua(form);
  const destinatario = form.destinatario || 'Thayná';
  const mesReferencia = String(form.mesReferencia || '').toUpperCase();
  const mesTexto = String(form.mesTexto || mesReferencia.split('/')[0] || '').toUpperCase();
  const periodoSabesp = form.periodoSabesp || '';
  const periodoPoco = form.periodoPoco || '';
  const assunto = `RATEIO DE ÁGUA - ${mesReferencia || mesTexto}`.trim();

  const corpo = `${destinatario}, bom dia.

Segue dados para fechamento mensal das medições de água relativo à ${mesReferencia}.

${mesTexto}: Fatura SABESP ${periodoSabesp} e poço ${periodoPoco}.

A tarifa deve ser de ${brl(calc.tarifa)}/m³ conforme racional abaixo:

VALOR POÇO 1: ${brl(calc.valorPoco1)}
VALOR POÇO 2: ${brl(calc.valorPoco2)}
VALOR SABESP: ${brl(calc.valorSabesp)}
VALOR TOTAL: ${brl(calc.valorTotal)}

CONSUMO POÇO 1: ${num(calc.consumoPoco1)} m³
CONSUMO POÇO 2: ${num(calc.consumoPoco2)} m³
CONSUMO SABESP: ${num(calc.consumoSabesp)} m³
CONSUMO TOTAL: ${num(calc.consumoTotal)} m³

TARIFA: ${brl(calc.tarifa)}/m³

Atenciosamente,`;

  return { assunto, corpo, ...calc };
}
