export default function Tabela({ columns, rows, empty = 'Nenhum registro encontrado.' }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
    <table className="w-full text-sm min-w-[720px]">
      <thead className="bg-slate-50 text-slate-500"><tr>{columns.map((c) => <th key={c.key} className="px-4 py-3 text-left font-semibold">{c.label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">{empty}</td></tr> : rows.map((row, idx) => <tr key={row.id || idx} className="hover:bg-slate-50/70">{columns.map((c) => <td key={c.key} className="px-4 py-3 text-slate-700 align-top">{c.render ? c.render(row, idx) : row[c.key]}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
}
