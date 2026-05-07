export const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const num = (value, digits = 2) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const int = (value) => Number(value || 0).toLocaleString('pt-BR');
export const today = () => new Date().toISOString().slice(0, 10);
export const month = () => new Date().toISOString().slice(0, 7);

export function parseBRNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return Number(String(value).replace(/\./g, '').replace(',', '.')) || 0;
}
