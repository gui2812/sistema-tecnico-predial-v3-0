import { brl, parseBRNumber } from './formatters';

export function formatListWithE(items) {
  const arr = [...new Set(items.filter(Boolean).map((x) => String(x).trim().toUpperCase()))];
  if (arr.length <= 1) return arr.join('');
  return `${arr.slice(0, -1).join(', ')} e ${arr[arr.length - 1]}`;
}

export function gerarMalote({ destinatario = 'Amanda', itens = [] }) {
  const fornecedores = formatListWithE(itens.map((i) => i.fornecedor));
  const nfs = formatListWithE(itens.map((i) => i.nf));
  const assunto = `MALOTE - ${fornecedores} - NF - ${nfs}.`;
  const blocos = itens.map((i) => {
    const valor = typeof i.valor === 'string' ? parseBRNumber(i.valor) : i.valor;
    return [
      `${String(i.fornecedor || '').toUpperCase()} - NF ${i.nf || ''} - ${brl(valor)}`,
      i.centroCusto || '',
      i.observacao ? `(${i.observacao})` : ''
    ].filter(Boolean).join('\n');
  }).join('\n\n');
  const corpo = `Olá, ${destinatario},\n\nDeixei com você o processo abaixo para envio ao CSC.\n\n${blocos}\n\nAtenciosamente,`;
  return { assunto, corpo };
}
