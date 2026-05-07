import { parseBRNumber } from './formatters';

export function calcularOhm({ tensao, corrente, resistencia }) {
  const V = parseBRNumber(tensao);
  const I = parseBRNumber(corrente);
  const R = parseBRNumber(resistencia);
  const hasV = String(tensao ?? '').trim() !== '';
  const hasI = String(corrente ?? '').trim() !== '';
  const hasR = String(resistencia ?? '').trim() !== '';

  if (hasI && hasR && !hasV) return { tipo: 'Tensão', valor: I * R, unidade: 'V', formula: 'V = R × I' };
  if (hasV && hasR && !hasI && R !== 0) return { tipo: 'Corrente', valor: V / R, unidade: 'A', formula: 'I = V ÷ R' };
  if (hasV && hasI && !hasR && I !== 0) return { tipo: 'Resistência', valor: V / I, unidade: 'Ω', formula: 'R = V ÷ I' };
  if (hasV && hasI && I !== 0) return { tipo: 'Resistência', valor: V / I, unidade: 'Ω', formula: 'R = V ÷ I' };
  return null;
}

export function calcularPotencia({ sistema = 'monofasico', tensao, corrente, fatorPotencia = '1' }) {
  const V = parseBRNumber(tensao);
  const I = parseBRNumber(corrente);
  const fpRaw = parseBRNumber(fatorPotencia);
  const fp = fpRaw > 0 ? Math.min(fpRaw, 1) : 1;
  if (!V || !I) return null;

  let sVA = 0;
  let pW = 0;
  let formula = '';

  if (sistema === 'cc') {
    sVA = V * I;
    pW = V * I;
    formula = 'P = V × I';
  } else if (sistema === 'trifasico') {
    sVA = Math.sqrt(3) * V * I;
    pW = sVA * fp;
    formula = 'P = √3 × V × I × FP';
  } else {
    sVA = V * I;
    pW = sVA * fp;
    formula = 'P = V × I × FP';
  }

  const sKVA = sVA / 1000;
  const pKW = pW / 1000;
  const qKVAr = sistema === 'cc' ? 0 : Math.sqrt(Math.max((sKVA ** 2) - (pKW ** 2), 0));

  return {
    sistema,
    tensao: V,
    corrente: I,
    fp,
    potenciaW: pW,
    potenciaKW: pKW,
    aparenteVA: sVA,
    aparenteKVA: sKVA,
    reativaKVAr: qKVAr,
    formula,
  };
}

export function calcularFatorPotencia({ potenciaAtivaKW, potenciaAparenteKVA }) {
  const kw = parseBRNumber(potenciaAtivaKW);
  const kva = parseBRNumber(potenciaAparenteKVA);
  if (!kw || !kva) return null;
  const fp = kw / kva;
  return {
    potenciaAtivaKW: kw,
    potenciaAparenteKVA: kva,
    fp,
    alerta: fp < 0.92 ? 'FP abaixo de 0,92 — verificar necessidade de correção.' : 'FP dentro de uma faixa adequada.',
    formula: 'FP = kW ÷ kVA',
  };
}

export function calcularMotor({ frequencia, polos, potenciaEntrada, potenciaSaida }) {
  const hz = parseBRNumber(frequencia);
  const p = parseBRNumber(polos);
  const entrada = parseBRNumber(potenciaEntrada);
  const saida = parseBRNumber(potenciaSaida);
  const rpm = hz && p ? (120 * hz) / p : 0;
  const rendimento = entrada && saida ? (saida / entrada) * 100 : 0;
  return {
    frequencia: hz,
    polos: p,
    potenciaEntrada: entrada,
    potenciaSaida: saida,
    rpm,
    rendimento,
    formulaRPM: 'RPM = 120 × frequência ÷ número de polos',
    formulaRendimento: 'Rendimento = potência de saída ÷ potência de entrada × 100',
  };
}

export function calcularQuedaTensao({ tensao, corrente, distancia, secao, material = 'cobre', sistema = 'monofasico' }) {
  const V = parseBRNumber(tensao);
  const I = parseBRNumber(corrente);
  const L = parseBRNumber(distancia);
  const S = parseBRNumber(secao);
  if (!V || !I || !L || !S) return null;
  const rho = material === 'aluminio' ? 0.0282 : 0.0175;
  const fator = sistema === 'trifasico' ? Math.sqrt(3) : 2;
  const quedaV = (fator * rho * L * I) / S;
  const quedaPercentual = (quedaV / V) * 100;
  return {
    tensao: V,
    corrente: I,
    distancia: L,
    secao: S,
    material,
    sistema,
    quedaV,
    quedaPercentual,
    formula: sistema === 'trifasico' ? 'ΔV = √3 × ρ × L × I ÷ S' : 'ΔV = 2 × ρ × L × I ÷ S',
    alerta: quedaPercentual > 4 ? 'Queda acima de 4% — verificar projeto e norma aplicável.' : 'Queda dentro de uma faixa de referência simples.',
  };
}
