export default function CardResumo({ titulo, valor, subtitulo, icon: Icon, cor = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700', teal: 'bg-teal-50 text-teal-700', amber: 'bg-amber-50 text-amber-700', purple: 'bg-purple-50 text-purple-700', rose: 'bg-rose-50 text-rose-700', slate: 'bg-slate-100 text-slate-700'
  };
  return <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm text-slate-500">{titulo}</p><h3 className="text-2xl font-bold mt-2 text-slate-900">{valor}</h3>{subtitulo && <p className="text-xs text-slate-400 mt-2">{subtitulo}</p>}</div>
      {Icon && <div className={`p-3 rounded-2xl ${colors[cor] || colors.blue}`}><Icon size={22}/></div>}
    </div>
  </div>
}
