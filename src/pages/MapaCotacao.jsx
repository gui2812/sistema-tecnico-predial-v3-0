import {
  FileSpreadsheet,
} from "lucide-react";

export default function MapaCotacao() {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <FileSpreadsheet
            size={24}
          />
        </div>

        <div>
          <h1 className="text-xl font-black text-slate-900">
            Mapa de Cotação
          </h1>

          <p className="text-sm text-slate-500">
            Auxílio para preenchimento, geração do Excel e unificação das propostas.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="font-black text-slate-700">
          Estrutura inicial criada com sucesso.
        </p>

        <p className="mt-2 text-sm text-slate-500">
          O formulário completo será adicionado na próxima etapa.
        </p>
      </div>
    </section>
  );
}
