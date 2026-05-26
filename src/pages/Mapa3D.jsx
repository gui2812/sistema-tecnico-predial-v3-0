import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  Layers3,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import {
  atualizarAndarMapa3D,
  atualizarLocalMapa3D,
  criarAndarMapa3D,
  criarLocalMapa3D,
  excluirAndarMapa3D,
  excluirLocalMapa3D,
  listarAndaresMapa3D,
  listarLocaisMapa3D,
} from "../services/mapa3dSupabaseService";

const CORES_PADRAO = [
  "#2563eb",
  "#0891b2",
  "#0f766e",
  "#7c3aed",
  "#ea580c",
  "#334155",
];

const TIPOS_LOCAL = [
  "Administrativo",
  "Técnico",
  "Equipamento",
  "Elétrica",
  "Hidráulica",
  "Ar-condicionado",
  "Segurança",
  "Operação",
  "Locatário",
  "Outro",
];

const ANDARES_BASE = [
  { nome: "5º Subsolo", ordem: -5, cor: "#334155", observacao: "Estacionamento / áreas técnicas" },
  { nome: "4º Subsolo", ordem: -4, cor: "#334155", observacao: "Estacionamento / áreas técnicas" },
  { nome: "3º Subsolo", ordem: -3, cor: "#334155", observacao: "Estacionamento / áreas técnicas" },
  { nome: "2º Subsolo", ordem: -2, cor: "#334155", observacao: "Estacionamento / áreas técnicas" },
  { nome: "1º Subsolo", ordem: -1, cor: "#334155", observacao: "Geradores, bombas e áreas técnicas" },
  { nome: "Térreo", ordem: 0, cor: "#0f766e", observacao: "Lobby, recepção e acessos" },
  { nome: "1º Andar", ordem: 1, cor: "#2563eb", observacao: "" },
  { nome: "2º Andar", ordem: 2, cor: "#2563eb", observacao: "" },
  { nome: "3º Andar", ordem: 3, cor: "#2563eb", observacao: "" },
  { nome: "4º Andar", ordem: 4, cor: "#2563eb", observacao: "" },
  { nome: "5º Andar", ordem: 5, cor: "#2563eb", observacao: "" },
  { nome: "6º Andar", ordem: 6, cor: "#2563eb", observacao: "" },
  { nome: "7º Andar", ordem: 7, cor: "#2563eb", observacao: "" },
  { nome: "8º Andar", ordem: 8, cor: "#2563eb", observacao: "" },
  { nome: "9º Andar", ordem: 9, cor: "#2563eb", observacao: "" },
  { nome: "10º Andar", ordem: 10, cor: "#2563eb", observacao: "" },
  { nome: "11º Andar", ordem: 11, cor: "#2563eb", observacao: "" },
  { nome: "12º Andar", ordem: 12, cor: "#2563eb", observacao: "" },
  { nome: "13º Andar", ordem: 13, cor: "#2563eb", observacao: "" },
  { nome: "Cobertura", ordem: 14, cor: "#7c3aed", observacao: "Cobertura, áreas técnicas e heliponto" },
];

function campoVazio() {
  return {
    nome: "",
    tipo: "Técnico",
    descricao: "",
    observacao: "",
    responsavel: "",
    status: "Ativo",
  };
}

function andarInicial() {
  return {
    nome: "",
    ordem: 0,
    altura: 1,
    cor: "#2563eb",
    observacao: "",
  };
}

function ordenarAndares(andares = []) {
  return [...andares].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

function locaisDoAndar(locais, andarId) {
  return locais.filter((local) => local.andarId === andarId);
}

function Badge({ children, color = "blue" }) {
  const cores = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${cores[color] || cores.blue}`}>
      {children}
    </span>
  );
}

function CardInfo({ titulo, valor, subtitulo, icon: Icon, cor = "blue" }) {
  const cores = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    slate: "bg-slate-50 border-slate-100 text-slate-700",
  };

  return (
    <div className={`rounded-3xl border p-4 min-w-0 ${cores[cor] || cores.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase opacity-75">{titulo}</p>
          <p className="text-2xl font-black mt-1 truncate">{valor}</p>
          <p className="text-xs font-semibold mt-1 opacity-70">{subtitulo}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center shrink-0">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function Predio3D({ andares, locais, andarSelecionado, setAndarSelecionado }) {
  const ordenados = ordenarAndares(andares);
  const largura = 4.6;
  const profundidade = 3.1;
  const alturaAndar = 0.42;
  const gap = 0.035;

  const menorOrdem = ordenados.length
    ? Math.min(...ordenados.map((andar) => Number(andar.ordem || 0)))
    : 0;

  return (
    <group position={[0, -2.15, 0]}>
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <boxGeometry args={[6.2, 0.18, 4.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.75} metalness={0.15} />
      </mesh>

      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.22, 3.65]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.65} metalness={0.05} />
      </mesh>

      {ordenados.map((andar, index) => {
        const y = index * (alturaAndar + gap) + 0.28;
        const selected = andarSelecionado?.id === andar.id;
        const qtdLocais = locaisDoAndar(locais, andar.id).length;
        const isSubsolo = Number(andar.ordem || 0) < 0;
        const isTerreo = Number(andar.ordem || 0) === 0;
        const isCobertura =
          String(andar.nome || "").toLowerCase().includes("cobertura") ||
          index === ordenados.length - 1;

        const corpoLargura = isSubsolo ? 5.0 : isTerreo ? 5.35 : largura;
        const corpoProfundidade = isSubsolo ? 3.45 : isTerreo ? 3.55 : profundidade;

        return (
          <group key={andar.id}>
            <mesh
              position={[0, y, 0]}
              castShadow
              receiveShadow
              onClick={(event) => {
                event.stopPropagation();
                setAndarSelecionado(andar);
              }}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "default";
              }}
            >
              <boxGeometry args={[corpoLargura, alturaAndar, corpoProfundidade]} />
              <meshStandardMaterial
                color={selected ? "#22d3ee" : andar.cor || "#2563eb"}
                roughness={0.25}
                metalness={0.35}
                transparent
                opacity={selected ? 0.92 : isSubsolo ? 0.52 : 0.74}
              />
            </mesh>

            <mesh position={[0, y + alturaAndar / 2 + 0.012, 0]} receiveShadow>
              <boxGeometry args={[corpoLargura + 0.08, 0.025, corpoProfundidade + 0.08]} />
              <meshStandardMaterial color={selected ? "#67e8f9" : "#cbd5e1"} roughness={0.5} />
            </mesh>

            {!isSubsolo && !isCobertura && (
              <>
                {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x, i) => (
                  <mesh key={`front-${andar.id}-${i}`} position={[x, y + 0.03, corpoProfundidade / 2 + 0.018]}>
                    <boxGeometry args={[0.28, 0.24, 0.012]} />
                    <meshStandardMaterial color="#dbeafe" roughness={0.12} metalness={0.55} />
                  </mesh>
                ))}

                {[-1.0, -0.5, 0, 0.5, 1.0].map((z, i) => (
                  <mesh key={`side-${andar.id}-${i}`} position={[corpoLargura / 2 + 0.018, y + 0.03, z]}>
                    <boxGeometry args={[0.012, 0.24, 0.22]} />
                    <meshStandardMaterial color="#dbeafe" roughness={0.12} metalness={0.55} />
                  </mesh>
                ))}
              </>
            )}

            {qtdLocais > 0 && (
              <Html
                position={[corpoLargura / 2 + 0.35, y + 0.03, 0]}
                center
                distanceFactor={12}
                occlude={false}
              >
                <button
                  onClick={() => setAndarSelecionado(andar)}
                  className={`px-2 py-1 rounded-full text-[10px] font-black shadow-lg border ${
                    selected
                      ? "bg-cyan-500 text-white border-cyan-300"
                      : "bg-white text-slate-800 border-slate-200"
                  }`}
                >
                  {qtdLocais}
                </button>
              </Html>
            )}

            {selected && (
              <Html position={[-corpoLargura / 2 - 0.65, y + 0.02, 0]} center distanceFactor={11}>
                <div className="bg-slate-950 text-white px-3 py-2 rounded-2xl shadow-xl border border-white/10 whitespace-nowrap">
                  <p className="text-[11px] font-black">{andar.nome}</p>
                  <p className="text-[10px] text-slate-300">{qtdLocais} local(is)</p>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      <mesh position={[0, ordenados.length * (alturaAndar + gap) + 0.18, 0]} castShadow>
        <boxGeometry args={[5.0, 0.28, 3.35]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.6} metalness={0.05} />
      </mesh>

      <mesh position={[0, ordenados.length * (alturaAndar + gap) + 0.38, 0]} castShadow>
        <boxGeometry args={[4.25, 0.18, 2.65]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.08} />
      </mesh>

      <Html position={[0, -0.55, 2.45]} center distanceFactor={12}>
        <div className="bg-white/95 backdrop-blur px-3 py-2 rounded-2xl shadow border border-slate-200 text-center">
          <p className="text-xs font-black text-slate-900">JK 1455</p>
          <p className="text-[10px] text-slate-500">Clique nos andares</p>
        </div>
      </Html>
    </group>
  );
}

function FormAndar({ aberto, setAberto, editando, setEditando, onSalvar, salvando }) {
  const [form, setForm] = useState(andarInicial());

  useEffect(() => {
    if (editando) {
      setForm({
        nome: editando.nome || "",
        ordem: editando.ordem ?? 0,
        altura: editando.altura ?? 1,
        cor: editando.cor || "#2563eb",
        observacao: editando.observacao || "",
      });
      setAberto(true);
    }
  }, [editando, setAberto]);

  if (!aberto) return null;

  function limpar() {
    setForm(andarInicial());
    setEditando(null);
    setAberto(false);
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-slate-900">
            {editando ? "Editar andar" : "Cadastrar andar"}
          </h3>
          <p className="text-sm text-slate-500">
            O andar será exibido como bloco clicável no prédio 3D.
          </p>
        </div>

        <button onClick={limpar} className="p-2 rounded-xl hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase">Nome do andar</label>
          <input
            value={form.nome}
            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex.: 1º Andar, Térreo, Cobertura"
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">Ordem</label>
          <input
            type="number"
            value={form.ordem}
            onChange={(e) => setForm((p) => ({ ...p, ordem: e.target.value }))}
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">Altura</label>
          <input
            type="number"
            step="0.1"
            value={form.altura}
            onChange={(e) => setForm((p) => ({ ...p, altura: e.target.value }))}
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">Cor</label>
          <div className="mt-1 flex gap-2">
            <input
              value={form.cor}
              onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
            />
            <input
              type="color"
              value={form.cor}
              onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))}
              className="h-12 w-14 rounded-xl border border-slate-200 bg-white"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="text-xs font-black text-slate-500 uppercase">Observação</label>
          <input
            value={form.observacao}
            onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
            placeholder="Ex.: Casa de máquinas, área técnica, laje corporativa..."
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CORES_PADRAO.map((cor) => (
          <button
            key={cor}
            onClick={() => setForm((p) => ({ ...p, cor }))}
            className="w-8 h-8 rounded-xl border border-slate-200"
            style={{ backgroundColor: cor }}
            title={cor}
          />
        ))}
      </div>

      <button
        onClick={() => onSalvar(form, editando, limpar)}
        disabled={salvando || !form.nome}
        className="mt-5 rounded-2xl bg-blue-600 text-white px-5 py-3 font-black hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {editando ? "Salvar alterações" : "Cadastrar andar"}
      </button>
    </div>
  );
}

function FormLocal({ andarSelecionado, editando, setEditando, onSalvar, salvando }) {
  const [form, setForm] = useState(campoVazio());

  useEffect(() => {
    if (editando) {
      setForm({
        nome: editando.nome || "",
        tipo: editando.tipo || "Técnico",
        descricao: editando.descricao || "",
        observacao: editando.observacao || "",
        responsavel: editando.responsavel || "",
        status: editando.status || "Ativo",
      });
    } else {
      setForm(campoVazio());
    }
  }, [editando, andarSelecionado?.id]);

  if (!andarSelecionado) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
        <MapPin className="mx-auto text-slate-300" size={36} />
        <h3 className="mt-3 font-black text-slate-900">Selecione um andar</h3>
        <p className="text-sm text-slate-500 mt-1">
          Clique em um bloco do prédio 3D para cadastrar locais/equipamentos.
        </p>
      </div>
    );
  }

  function limpar() {
    setEditando(null);
    setForm(campoVazio());
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-slate-900">
            {editando ? "Editar local/equipamento" : "Cadastrar local/equipamento"}
          </h3>
          <p className="text-sm text-slate-500">
            Andar selecionado: <strong>{andarSelecionado.nome}</strong>
          </p>
        </div>

        {editando && (
          <button onClick={limpar} className="p-2 rounded-xl hover:bg-slate-100">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-black text-slate-500 uppercase">Nome</label>
          <input
            value={form.nome}
            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex.: ADM, CAG01, Sala elétrica..."
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm bg-white"
          >
            {TIPOS_LOCAL.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">Responsável</label>
          <input
            value={form.responsavel}
            onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
            placeholder="Ex.: Manutenção, BMS, Segurança..."
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm bg-white"
          >
            <option value="Ativo">Ativo</option>
            <option value="Atenção">Atenção</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            placeholder="Descrição do ambiente/equipamento..."
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm min-h-[82px]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase">Observação</label>
          <textarea
            value={form.observacao}
            onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
            placeholder="Observações operacionais, acesso, rotina, pendências..."
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm min-h-[72px]"
          />
        </div>
      </div>

      <button
        onClick={() => onSalvar(form, editando, limpar)}
        disabled={salvando || !form.nome}
        className="mt-5 rounded-2xl bg-slate-950 text-white px-5 py-3 font-black hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
      >
        {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {editando ? "Salvar local" : "Cadastrar local"}
      </button>
    </div>
  );
}

export default function Mapa3D({ user }) {
  const [andares, setAndares] = useState([]);
  const [locais, setLocais] = useState([]);
  const [andarSelecionado, setAndarSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [formAndarAberto, setFormAndarAberto] = useState(false);
  const [andarEditando, setAndarEditando] = useState(null);
  const [localEditando, setLocalEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const andaresOrdenados = useMemo(() => ordenarAndares(andares), [andares]);

  const locaisSelecionados = useMemo(() => {
    if (!andarSelecionado) return [];
    return locaisDoAndar(locais, andarSelecionado.id);
  }, [locais, andarSelecionado]);

  const locaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return locais;

    return locais.filter((local) => {
      const texto = [
        local.nome,
        local.tipo,
        local.descricao,
        local.observacao,
        local.responsavel,
        local.status,
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [locais, busca]);

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!andarSelecionado && andaresOrdenados.length) {
      setAndarSelecionado(andaresOrdenados[0]);
    }
  }, [andaresOrdenados, andarSelecionado]);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const [listaAndares, listaLocais] = await Promise.all([
        listarAndaresMapa3D(),
        listarLocaisMapa3D(),
      ]);

      setAndares(listaAndares);
      setLocais(listaLocais);

      if (listaAndares.length) {
        const atualAindaExiste = listaAndares.find((a) => a.id === andarSelecionado?.id);
        setAndarSelecionado(atualAindaExiste || listaAndares[0]);
      }
    } catch (err) {
      console.error(err);
      setErro("Não foi possível carregar o Mapa 3D. Confira as tabelas do Supabase.");
    } finally {
      setCarregando(false);
    }
  }

  async function criarAndaresBase() {
    setSalvando(true);
    setErro("");

    try {
      for (const andar of ANDARES_BASE) {
        const jaExiste = andares.some(
          (a) => String(a.nome).toLowerCase() === String(andar.nome).toLowerCase()
        );

        if (!jaExiste) {
          await criarAndarMapa3D(andar);
        }
      }

      await carregar();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível criar os andares base.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAndar(form, editando, limpar) {
    setSalvando(true);
    setErro("");

    try {
      if (editando) {
        const atualizado = await atualizarAndarMapa3D(editando.id, form);
        setAndares((prev) => prev.map((a) => (a.id === atualizado.id ? atualizado : a)));
        setAndarSelecionado((prev) => (prev?.id === atualizado.id ? atualizado : prev));
      } else {
        const criado = await criarAndarMapa3D(form);
        setAndares((prev) => ordenarAndares([...prev, criado]));
        setAndarSelecionado(criado);
      }

      limpar();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível salvar o andar.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerAndar(andar) {
    const confirmar = window.confirm(
      `Deseja excluir o andar "${andar.nome}"? Os locais ligados a ele deixarão de aparecer.`
    );

    if (!confirmar) return;

    setSalvando(true);
    setErro("");

    try {
      await excluirAndarMapa3D(andar.id);
      await carregar();
      setAndarSelecionado(null);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível excluir o andar.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarLocal(form, editando, limpar) {
    if (!andarSelecionado) return;

    setSalvando(true);
    setErro("");

    try {
      if (editando) {
        const atualizado = await atualizarLocalMapa3D(editando.id, {
          ...form,
          andarId: andarSelecionado.id,
        });

        setLocais((prev) => prev.map((l) => (l.id === atualizado.id ? atualizado : l)));
      } else {
        const criado = await criarLocalMapa3D({
          ...form,
          andarId: andarSelecionado.id,
        });

        setLocais((prev) => [criado, ...prev]);
      }

      limpar();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível salvar o local/equipamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerLocal(local) {
    const confirmar = window.confirm(`Deseja excluir "${local.nome}"?`);
    if (!confirmar) return;

    setSalvando(true);
    setErro("");

    try {
      await excluirLocalMapa3D(local.id);
      setLocais((prev) => prev.filter((l) => l.id !== local.id));
      if (localEditando?.id === local.id) setLocalEditando(null);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível excluir o local.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-13 h-13 rounded-3xl bg-cyan-400/15 border border-cyan-300/20 flex items-center justify-center">
                <Building2 className="text-cyan-200" size={28} />
              </div>

              <div>
                <p className="text-cyan-200 font-semibold">Edifício JK 1455</p>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                  Mapa 3D do Prédio
                </h1>
              </div>
            </div>

            <p className="text-slate-300 max-w-3xl">
              Visualize o prédio em 360°, clique nos andares e cadastre manualmente
              locais, equipamentos e observações operacionais por pavimento.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={carregar}
              className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 font-bold hover:bg-white/15 flex items-center gap-2"
            >
              <RefreshCcw size={18} />
              Atualizar
            </button>

            <button
              onClick={() => setFormAndarAberto(true)}
              className="rounded-2xl bg-cyan-400 text-slate-950 px-4 py-3 font-black hover:bg-cyan-300 flex items-center gap-2"
            >
              <Plus size={18} />
              Cadastrar andar
            </button>
          </div>
        </div>
      </section>

      {erro && (
        <div className="rounded-3xl bg-amber-50 border border-amber-100 text-amber-800 p-4 flex gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardInfo
          titulo="Andares cadastrados"
          valor={andares.length}
          subtitulo="Blocos clicáveis no 3D"
          icon={Layers3}
          cor="blue"
        />

        <CardInfo
          titulo="Locais/equipamentos"
          valor={locais.length}
          subtitulo="Registros no Supabase"
          icon={MapPin}
          cor="green"
        />

        <CardInfo
          titulo="Andar selecionado"
          valor={andarSelecionado?.nome || "-"}
          subtitulo={`${locaisSelecionados.length} local(is) nesse andar`}
          icon={Eye}
          cor="purple"
        />
      </div>

      {carregando ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
          <p className="mt-3 font-bold text-slate-700">Carregando Mapa 3D...</p>
        </div>
      ) : andares.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
          <Building2 className="mx-auto text-slate-300" size={42} />
          <h3 className="mt-3 text-xl font-black text-slate-900">
            Nenhum andar cadastrado
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Crie os andares base para iniciar o mapa 3D do JK 1455.
          </p>

          <button
            onClick={criarAndaresBase}
            disabled={salvando}
            className="mt-5 rounded-2xl bg-blue-600 text-white px-5 py-3 font-black hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {salvando ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Criar andares base
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-[1.45fr_0.9fr] gap-6">
          <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Visualização 3D
                </h2>
                <p className="text-sm text-slate-500">
                  Gire, aproxime e clique nos pavimentos para abrir os detalhes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge color="blue">Clique no andar</Badge>
                <Badge color="green">Zoom liberado</Badge>
                <Badge color="slate">Supabase</Badge>
              </div>
            </div>

            <div className="h-[620px] bg-gradient-to-b from-slate-100 via-blue-50 to-slate-200">
              <Canvas shadows dpr={[1, 1.6]}>
                <PerspectiveCamera makeDefault position={[6.8, 7.2, 8.8]} fov={43} />
                <ambientLight intensity={0.65} />
                <directionalLight
                  position={[6, 9, 5]}
                  intensity={1.2}
                  castShadow
                  shadow-mapSize={[1024, 1024]}
                />
                <pointLight position={[-4, 6, -3]} intensity={0.6} color="#93c5fd" />
                <Predio3D
                  andares={andaresOrdenados}
                  locais={locais}
                  andarSelecionado={andarSelecionado}
                  setAndarSelecionado={setAndarSelecionado}
                />
                <ContactShadows opacity={0.25} scale={13} blur={2.5} far={5} position={[0, -2.38, 0]} />
                <Environment preset="city" />
                <OrbitControls
                  enablePan
                  enableZoom
                  enableRotate
                  minDistance={5}
                  maxDistance={16}
                  maxPolarAngle={Math.PI / 2.02}
                />
              </Canvas>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Andar selecionado</p>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">
                    {andarSelecionado?.nome || "-"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {andarSelecionado?.observacao || "Sem observação cadastrada."}
                  </p>
                </div>

                {andarSelecionado && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAndarEditando(andarSelecionado)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
                      title="Editar andar"
                    >
                      <Edit3 size={18} />
                    </button>

                    <button
                      onClick={() => removerAndar(andarSelecionado)}
                      className="p-2 rounded-xl hover:bg-rose-50 text-rose-600"
                      title="Excluir andar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-400 font-bold">Ordem</p>
                  <p className="font-black text-slate-900">{andarSelecionado?.ordem ?? "-"}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-400 font-bold">Locais</p>
                  <p className="font-black text-slate-900">{locaisSelecionados.length}</p>
                </div>
              </div>
            </div>

            <FormLocal
              andarSelecionado={andarSelecionado}
              editando={localEditando}
              setEditando={setLocalEditando}
              onSalvar={salvarLocal}
              salvando={salvando}
            />
          </section>
        </div>
      )}

      <FormAndar
        aberto={formAndarAberto}
        setAberto={setFormAndarAberto}
        editando={andarEditando}
        setEditando={setAndarEditando}
        onSalvar={salvarAndar}
        salvando={salvando}
      />

      {andares.length > 0 && (
        <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <h3 className="font-black text-slate-900 mb-3">Andares</h3>

            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {andaresOrdenados.map((andar) => {
                const ativo = andarSelecionado?.id === andar.id;
                const qtd = locaisDoAndar(locais, andar.id).length;

                return (
                  <button
                    key={andar.id}
                    onClick={() => setAndarSelecionado(andar)}
                    className={`w-full text-left rounded-2xl border p-3 transition ${
                      ativo
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: andar.cor || "#2563eb" }}
                        />
                        <div className="min-w-0">
                          <p className="font-black truncate">{andar.nome}</p>
                          <p className="text-xs opacity-70 truncate">
                            Ordem {andar.ordem} • {qtd} local(is)
                          </p>
                        </div>
                      </div>

                      <Eye size={16} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-black text-slate-900">
                  Locais e equipamentos cadastrados
                </h3>
                <p className="text-sm text-slate-500">
                  Lista geral do prédio, filtrável por texto.
                </p>
              </div>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar local, tipo, responsável..."
                className="rounded-2xl border border-slate-200 p-3 text-sm w-full lg:w-80"
              />
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-black">Nome</th>
                    <th className="text-left px-4 py-3 font-black">Andar</th>
                    <th className="text-left px-4 py-3 font-black">Tipo</th>
                    <th className="text-left px-4 py-3 font-black">Responsável</th>
                    <th className="text-left px-4 py-3 font-black">Status</th>
                    <th className="text-right px-4 py-3 font-black">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {locaisFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhum local cadastrado.
                      </td>
                    </tr>
                  )}

                  {locaisFiltrados.map((local) => {
                    const andar = andares.find((a) => a.id === local.andarId);

                    return (
                      <tr key={local.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-900">{local.nome}</p>
                          {local.descricao && (
                            <p className="text-xs text-slate-500 max-w-md truncate">
                              {local.descricao}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {andar?.nome || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <Badge color="blue">{local.tipo || "Local"}</Badge>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {local.responsavel || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            color={
                              local.status === "Ativo"
                                ? "green"
                                : local.status === "Atenção"
                                  ? "amber"
                                  : "slate"
                            }
                          >
                            {local.status || "Ativo"}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                if (andar) setAndarSelecionado(andar);
                                setLocalEditando(local);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                              title="Editar"
                            >
                              <Edit3 size={17} />
                            </button>

                            <button
                              onClick={() => removerLocal(local)}
                              className="p-2 rounded-xl hover:bg-rose-50 text-rose-600"
                              title="Excluir"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
