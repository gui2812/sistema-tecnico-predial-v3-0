import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Info,
  Layers3,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  UploadCloud,
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
  sincronizarAndaresBaseMapa3D,
  uploadPlantaAndarMapa3D,
} from "../services/mapa3dSupabaseService";

const CORES_PADRAO = [
  "#334155",
  "#0f766e",
  "#0369a1",
  "#2563eb",
  "#7c3aed",
  "#ea580c",
];

const CATEGORIAS = [
  { id: "subsolo", label: "Subsolo" },
  { id: "terreo", label: "Térreo / implantação" },
  { id: "tecnico", label: "Pavimento técnico" },
  { id: "comercial", label: "Pavimento comercial" },
  { id: "cobertura", label: "Cobertura" },
  { id: "maquinas", label: "Casa de máquinas" },
  { id: "heliponto", label: "Heliponto" },
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
  {
    nome: "5º Subsolo",
    ordem: -5,
    altura: 1,
    alturaVisual: 0.78,
    cor: "#334155",
    categoria: "subsolo",
    codigoProjeto: "2446-AR-PE-001-R04",
    observacao: "Estacionamento e áreas técnicas.",
    destaque: "Planta arquitetônica do 5º subsolo.",
  },
  {
    nome: "4º Subsolo",
    ordem: -4,
    altura: 1,
    alturaVisual: 0.78,
    cor: "#334155",
    categoria: "subsolo",
    codigoProjeto: "2446-AR-PE-002-R03",
    observacao: "Estacionamento e áreas técnicas.",
    destaque: "Planta arquitetônica do 4º subsolo.",
  },
  {
    nome: "3º Subsolo",
    ordem: -3,
    altura: 1,
    alturaVisual: 0.78,
    cor: "#334155",
    categoria: "subsolo",
    codigoProjeto: "2446-AR-PE-003-R03",
    observacao: "Estacionamento e áreas técnicas.",
    destaque: "Planta arquitetônica do 3º subsolo.",
  },
  {
    nome: "2º Subsolo",
    ordem: -2,
    altura: 1,
    alturaVisual: 0.78,
    cor: "#334155",
    categoria: "subsolo",
    codigoProjeto: "2446-AR-PE-004-R04",
    observacao: "Estacionamento e áreas técnicas.",
    destaque: "Planta arquitetônica do 2º subsolo.",
  },
  {
    nome: "1º Subsolo",
    ordem: -1,
    altura: 1,
    alturaVisual: 0.82,
    cor: "#334155",
    categoria: "subsolo",
    codigoProjeto: "2446-AR-PE-005-R05",
    observacao: "Estacionamento e áreas técnicas.",
    destaque: "Planta arquitetônica do 1º subsolo.",
  },
  {
    nome: "Térreo",
    ordem: 0,
    altura: 1,
    alturaVisual: 1.38,
    cor: "#0f766e",
    categoria: "terreo",
    codigoProjeto: "2446-AR-PE-006-R18",
    observacao: "Implantação, lobby, recepção, auditório e acessos.",
    destaque: "Embasamento alto com pórtico principal.",
  },
  {
    nome: "1º Pav. Técnico",
    ordem: 1,
    altura: 1,
    alturaVisual: 0.95,
    cor: "#0369a1",
    categoria: "tecnico",
    codigoProjeto: "2446-AR-PE-007-R04",
    observacao: "Áreas técnicas e apoio operacional.",
    destaque: "Primeiro pavimento técnico.",
  },
  {
    nome: "2º Pav. Técnico",
    ordem: 2,
    altura: 1,
    alturaVisual: 0.95,
    cor: "#0369a1",
    categoria: "tecnico",
    codigoProjeto: "2446-AR-PE-008-R02",
    observacao: "Geradores, elétrica, automação e áreas técnicas.",
    destaque: "Segundo pavimento técnico.",
  },
  ...Array.from({ length: 11 }, (_, indice) => {
    const numero = indice + 3;

    return {
      nome: `${numero}º Andar`,
      ordem: numero,
      altura: 1,
      alturaVisual: 0.82,
      cor: "#2563eb",
      categoria: "comercial",
      codigoProjeto:
        numero === 3
          ? "2446-AR-PE-009-R01"
          : "2446-AR-PE-009-R01 (pavimento-tipo)",
      observacao: "Pavimento comercial.",
      destaque: "Torre corporativa envidraçada.",
    };
  }),
  {
    nome: "14º Andar",
    ordem: 14,
    altura: 1,
    alturaVisual: 0.82,
    cor: "#2563eb",
    categoria: "comercial",
    codigoProjeto: "2446-AR-PE-010-R01",
    observacao: "Pavimento comercial.",
    destaque: "Torre corporativa envidraçada.",
  },
  {
    nome: "15º Andar",
    ordem: 15,
    altura: 1,
    alturaVisual: 0.82,
    cor: "#2563eb",
    categoria: "comercial",
    codigoProjeto: "2446-AR-PE-010-R01",
    observacao: "Pavimento comercial.",
    destaque: "Torre corporativa envidraçada.",
  },
  {
    nome: "16º Andar",
    ordem: 16,
    altura: 1,
    alturaVisual: 0.82,
    cor: "#2563eb",
    categoria: "comercial",
    codigoProjeto: "2446-AR-PE-011-R01",
    observacao: "Último pavimento comercial.",
    destaque: "Fechamento superior da torre corporativa.",
  },
  {
    nome: "Cobertura",
    ordem: 17,
    altura: 1,
    alturaVisual: 0.78,
    cor: "#7c3aed",
    categoria: "cobertura",
    codigoProjeto: "2446-AR-PE-012-R06",
    observacao: "Cobertura e áreas técnicas.",
    destaque: "Laje de cobertura.",
  },
  {
    nome: "Casa de Máquinas",
    ordem: 18,
    altura: 1,
    alturaVisual: 1.08,
    cor: "#7c3aed",
    categoria: "maquinas",
    codigoProjeto: "2446-AR-PE-013-R06",
    observacao: "Casa de máquinas.",
    destaque: "Volume técnico superior.",
  },
  {
    nome: "Heliponto",
    ordem: 19,
    altura: 1,
    alturaVisual: 0.38,
    cor: "#ea580c",
    categoria: "heliponto",
    codigoProjeto: "2446-AR-PE-013-R06",
    observacao: "Heliponto.",
    destaque: "Topo do edifício.",
  },
];

const EMPRESAS_POR_ANDAR = {
  4: "Hirata / Regus",
  5: "Tauil",
  7: "OCP / Tauil",
  8: "INPASA / Moody's",
  10: "BMA",
  11: "BMA",
  12: "Simpson / vago",
  14: "Danske / Motors / Ferrara",
  15: "Blerkley / Western",
};

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
    alturaVisual: 1,
    cor: "#2563eb",
    observacao: "",
    codigoProjeto: "",
    plantaUrl: "",
    categoria: "comercial",
    destaque: "",
  };
}

function ordenarAndares(andares = []) {
  return [...andares].sort(
    (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
  );
}

function locaisDoAndar(locais, andarId) {
  return locais.filter((local) => local.andarId === andarId);
}

function categoriaDoAndar(andar = {}) {
  if (andar.categoria) return andar.categoria;

  const nome = String(andar.nome || "").toLowerCase();
  const ordem = Number(andar.ordem || 0);

  if (ordem < 0 || nome.includes("subsolo")) return "subsolo";
  if (ordem === 0 || nome.includes("térreo") || nome.includes("terreo")) {
    return "terreo";
  }

  if (nome.includes("técn") || nome.includes("tecn")) return "tecnico";
  if (nome.includes("heliponto")) return "heliponto";
  if (nome.includes("máquina") || nome.includes("maquina")) return "maquinas";
  if (nome.includes("cobertura")) return "cobertura";

  return "comercial";
}

function corBadgePorTipo(tipo = "") {
  const texto = String(tipo).toLowerCase();

  if (texto.includes("locat")) return "purple";
  if (texto.includes("hid")) return "blue";
  if (texto.includes("el")) return "amber";
  if (texto.includes("seg")) return "amber";

  if (
    texto.includes("técn") ||
    texto.includes("tecn") ||
    texto.includes("equip")
  ) {
    return "slate";
  }

  if (texto.includes("op")) return "green";

  return "blue";
}

function resumirLocais(locais = []) {
  const grupos = {};

  locais.forEach((local) => {
    const tipo = local.tipo || "Local";
    grupos[tipo] = (grupos[tipo] || 0) + 1;
  });

  return Object.entries(grupos)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, total]) => ({ tipo, total }));
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
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${
        cores[color] || cores.blue
      }`}
    >
      {children}
    </span>
  );
}

function CardInfo({
  titulo,
  valor,
  subtitulo,
  icon: Icon,
  cor = "blue",
}) {
  const cores = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    slate: "bg-slate-50 border-slate-100 text-slate-700",
  };

  return (
    <div
      className={`rounded-3xl border p-4 min-w-0 ${
        cores[cor] || cores.blue
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase opacity-75">{titulo}</p>
          <p className="text-2xl font-black mt-1 truncate">{valor}</p>
          <p className="text-xs font-semibold mt-1 opacity-70">
            {subtitulo}
          </p>
        </div>

        <div className="w-11 h-11 rounded-2xl bg-white/70 flex items-center justify-center shrink-0">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function Bloco({
  position,
  size,
  color,
  opacity = 1,
  roughness = 0.45,
  metalness = 0.08,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  return (
    <mesh
      position={position}
      castShadow
      receiveShadow
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <boxGeometry args={size} />

      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

function parametrosDoAndar(andar) {
  const categoria = categoriaDoAndar(andar);
  const fator = Number(andar.alturaVisual || andar.altura || 1);

  const parametros = {
    subsolo: {
      altura: 0.37,
      largura: 7.1,
      profundidade: 4.7,
    },
    terreo: {
      altura: 0.95,
      largura: 7.35,
      profundidade: 4.95,
    },
    tecnico: {
      altura: 0.58,
      largura: 5.65,
      profundidade: 3.62,
    },
    comercial: {
      altura: 0.46,
      largura: 5.28,
      profundidade: 3.34,
    },
    cobertura: {
      altura: 0.38,
      largura: 5.45,
      profundidade: 3.52,
    },
    maquinas: {
      altura: 0.62,
      largura: 4.6,
      profundidade: 2.82,
    },
    heliponto: {
      altura: 0.18,
      largura: 4.95,
      profundidade: 3.08,
    },
  };

  const base = parametros[categoria] || parametros.comercial;

  return {
    categoria,
    altura: Math.max(0.15, base.altura * fator),
    largura: base.largura,
    profundidade: base.profundidade,
  };
}

function JanelasFachada({
  andar,
  y,
  largura,
  profundidade,
  altura,
  selecionado,
}) {
  const categoria = categoriaDoAndar(andar);

  if (!["comercial", "tecnico"].includes(categoria)) {
    return null;
  }

  const totalFrente = categoria === "comercial" ? 10 : 8;
  const totalLateral = categoria === "comercial" ? 5 : 4;

  const frenteXs = Array.from(
    { length: totalFrente },
    (_, indice) =>
      -largura / 2 +
      0.32 +
      indice * ((largura - 0.64) / (totalFrente - 1))
  );

  const lateralZs = Array.from(
    { length: totalLateral },
    (_, indice) =>
      -profundidade / 2 +
      0.32 +
      indice * ((profundidade - 0.64) / (totalLateral - 1))
  );

  const corVidro = selecionado ? "#a5f3fc" : "#b9e6ff";

  return (
    <>
      {frenteXs.map((x, indice) => (
        <group key={`frente-${andar.id}-${indice}`}>
          <Bloco
            position={[x, y, profundidade / 2 + 0.018]}
            size={[0.27, altura * 0.63, 0.024]}
            color={corVidro}
            roughness={0.1}
            metalness={0.68}
          />

          <Bloco
            position={[x, y, -profundidade / 2 - 0.018]}
            size={[0.27, altura * 0.63, 0.024]}
            color={corVidro}
            roughness={0.1}
            metalness={0.68}
          />
        </group>
      ))}

      {lateralZs.map((z, indice) => (
        <group key={`lateral-${andar.id}-${indice}`}>
          <Bloco
            position={[largura / 2 + 0.018, y, z]}
            size={[0.024, altura * 0.63, 0.24]}
            color={corVidro}
            roughness={0.1}
            metalness={0.68}
          />

          <Bloco
            position={[-largura / 2 - 0.018, y, z]}
            size={[0.024, altura * 0.63, 0.24]}
            color={corVidro}
            roughness={0.1}
            metalness={0.68}
          />
        </group>
      ))}
    </>
  );
}

function Predio3D({
  andares,
  locais,
  andarSelecionado,
  setAndarSelecionado,
}) {
  const pavimentos = useMemo(() => {
    const ordenados = ordenarAndares(andares);
    let cursorY = -1.95;

    return ordenados.map((andar) => {
      const parametros = parametrosDoAndar(andar);

      const gap =
        parametros.categoria === "subsolo"
          ? 0.018
          : 0.035;

      const y = cursorY + parametros.altura / 2;

      cursorY += parametros.altura + gap;

      return {
        ...andar,
        ...parametros,
        y,
        topo: cursorY,
      };
    });
  }, [andares]);

  const topoPredio = pavimentos.length
    ? pavimentos[pavimentos.length - 1].topo
    : 4;

  const terreo = pavimentos.find(
    (andar) => andar.categoria === "terreo"
  );

  const frenteZ = terreo
    ? terreo.profundidade / 2 + 0.42
    : 2.9;

  return (
    <group position={[0, -1.05, 0]}>
      <Bloco
        position={[0, -2.15, 0]}
        size={[10.2, 0.22, 7.6]}
        color="#0f172a"
        roughness={0.78}
        metalness={0.12}
      />

      <Bloco
        position={[0, -2.0, 0]}
        size={[9.55, 0.12, 6.95]}
        color="#dbe4ee"
        roughness={0.72}
      />

      <Bloco
        position={[-3.25, -1.84, 0.5]}
        size={[1.4, 0.12, 5.55]}
        color="#cbd5e1"
        roughness={0.7}
      />

      <Bloco
        position={[3.25, -1.84, 0.25]}
        size={[1.35, 0.12, 5.7]}
        color="#cbd5e1"
        roughness={0.7}
      />

      {pavimentos.map((andar) => {
        const selecionado =
          andarSelecionado?.id === andar.id;

        const qtdLocais =
          locaisDoAndar(locais, andar.id).length;

        const opacidade =
          andar.categoria === "subsolo"
            ? 0.62
            : selecionado
              ? 0.98
              : 0.9;

        const cor =
          selecionado
            ? "#22d3ee"
            : andar.cor || "#2563eb";

        return (
          <group key={andar.id}>
            <Bloco
              position={[0, andar.y, 0]}
              size={[
                andar.largura,
                andar.altura,
                andar.profundidade,
              ]}
              color={cor}
              opacity={opacidade}
              roughness={
                andar.categoria === "comercial"
                  ? 0.18
                  : 0.34
              }
              metalness={
                andar.categoria === "comercial"
                  ? 0.42
                  : 0.2
              }
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
            />

            <Bloco
              position={[
                0,
                andar.y + andar.altura / 2 + 0.012,
                0,
              ]}
              size={[
                andar.largura + 0.08,
                0.024,
                andar.profundidade + 0.08,
              ]}
              color={
                selecionado
                  ? "#67e8f9"
                  : "#dce7f1"
              }
              roughness={0.5}
              metalness={0.05}
            />

            <JanelasFachada
              andar={andar}
              y={andar.y}
              largura={andar.largura}
              profundidade={andar.profundidade}
              altura={andar.altura}
              selecionado={selecionado}
            />

            {qtdLocais > 0 && (
              <Html
                position={[
                  andar.largura / 2 + 0.38,
                  andar.y + 0.02,
                  0,
                ]}
                center
                distanceFactor={13}
                occlude={false}
              >
                <button
                  onClick={() => setAndarSelecionado(andar)}
                  className={`px-2 py-1 rounded-full text-[10px] font-black shadow-lg border ${
                    selecionado
                      ? "bg-cyan-500 text-white border-cyan-300"
                      : "bg-white text-slate-800 border-slate-200"
                  }`}
                >
                  {qtdLocais}
                </button>
              </Html>
            )}

            {selecionado && (
              <Html
                position={[
                  -andar.largura / 2 - 0.8,
                  andar.y + 0.02,
                  0,
                ]}
                center
                distanceFactor={12}
              >
                <div className="bg-slate-950 text-white px-3 py-2 rounded-2xl shadow-xl border border-white/10 whitespace-nowrap">
                  <p className="text-[11px] font-black">
                    {andar.nome}
                  </p>

                  <p className="text-[10px] text-slate-300">
                    {qtdLocais} local(is)
                  </p>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      <Bloco
        position={[
          0,
          terreo ? terreo.y + 0.1 : -0.35,
          frenteZ,
        ]}
        size={[4.7, 0.18, 1.35]}
        color="#e2e8f0"
        roughness={0.55}
      />

      <Bloco
        position={[
          0,
          terreo ? terreo.y + 0.47 : 0,
          frenteZ + 0.12,
        ]}
        size={[4.45, 0.11, 1.18]}
        color="#cbd5e1"
        roughness={0.5}
      />

      {[-1.75, -0.58, 0.58, 1.75].map((x) => (
        <Bloco
          key={`portico-${x}`}
          position={[
            x,
            terreo ? terreo.y - 0.08 : -0.5,
            frenteZ + 0.23,
          ]}
          size={[0.18, 1.28, 0.18]}
          color="#e5e7eb"
          roughness={0.42}
        />
      ))}

      <Bloco
        position={[2.98, topoPredio - 3.6, -0.18]}
        size={[0.44, 7.2, 2.78]}
        color="#cbd5e1"
        roughness={0.48}
      />

      <Bloco
        position={[-2.98, topoPredio - 3.6, -0.18]}
        size={[0.44, 7.2, 2.78]}
        color="#cbd5e1"
        roughness={0.48}
      />

      <mesh
        position={[0, topoPredio + 0.16, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1.48, 1.48, 0.14, 64]} />

        <meshStandardMaterial
          color="#dbe4ee"
          roughness={0.58}
          metalness={0.08}
        />
      </mesh>

      <mesh
        position={[0, topoPredio + 0.24, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[1.03, 0.055, 16, 64]} />

        <meshStandardMaterial
          color="#ef4444"
          roughness={0.42}
        />
      </mesh>

      <Bloco
        position={[0, topoPredio + 0.27, 0]}
        size={[1.35, 0.04, 0.14]}
        color="#ef4444"
      />

      <Bloco
        position={[0, topoPredio + 0.27, 0]}
        size={[0.14, 0.04, 1.35]}
        color="#ef4444"
      />

      <Html
        position={[0, -2.22, 4.05]}
        center
        distanceFactor={13}
      >
        <div className="bg-white/95 backdrop-blur px-4 py-2 rounded-2xl shadow border border-slate-200 text-center">
          <p className="text-xs font-black text-slate-900">
            Edifício JK 1455
          </p>

          <p className="text-[10px] text-slate-500">
            Modelo paramétrico arquitetônico
          </p>
        </div>
      </Html>
    </group>
  );
}

function VisualizadorPlanta({ andar }) {
  const [aberto, setAberto] = useState(false);

  const url = andar?.plantaUrl || "";

  useEffect(() => {
    setAberto(false);
  }, [andar?.id]);

  if (!andar) return null;

  const ehImagem =
    /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(url);

  return (
    <div className="mt-4 rounded-3xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={17} className="text-blue-600" />

          <div>
            <p className="font-black text-slate-800">
              Planta arquitetônica
            </p>

            <p className="text-xs text-slate-500">
              {andar.codigoProjeto || "Código ainda não informado"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {url && (
            <button
              onClick={() => setAberto((valor) => !valor)}
              className="rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-black hover:bg-blue-700"
            >
              {aberto ? "Fechar planta" : "Ver planta"}
            </button>
          )}

          {url && (
            <button
              onClick={() =>
                window.open(
                  url,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 flex items-center gap-1"
            >
              <ExternalLink size={14} />
              Abrir arquivo
            </button>
          )}
        </div>
      </div>

      {!url && (
        <div className="p-4 text-sm text-slate-500">
          Ainda não existe uma planta anexada. Edite o andar e use o
          botão <strong>Subir planta</strong>.
        </div>
      )}

      {url && aberto && (
        <div className="bg-slate-100 h-[520px]">
          {ehImagem ? (
            <img
              src={url}
              alt={`Planta ${andar.nome}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              title={`Planta ${andar.nome}`}
              src={url}
              className="w-full h-full border-0"
            />
          )}
        </div>
      )}
    </div>
  );
}

function FormAndar({
  aberto,
  setAberto,
  editando,
  setEditando,
  onSalvar,
  salvando,
  onUpload,
}) {
  const [form, setForm] = useState(andarInicial());
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);

  useEffect(() => {
    if (!editando) return;

    setForm({
      nome: editando.nome || "",
      ordem: editando.ordem ?? 0,
      altura: editando.altura ?? 1,
      alturaVisual:
        editando.alturaVisual ??
        editando.altura ??
        1,
      cor: editando.cor || "#2563eb",
      observacao: editando.observacao || "",
      codigoProjeto: editando.codigoProjeto || "",
      plantaUrl: editando.plantaUrl || "",
      categoria: categoriaDoAndar(editando),
      destaque: editando.destaque || "",
    });

    setAberto(true);
  }, [editando, setAberto]);

  if (!aberto) return null;

  function limpar() {
    setForm(andarInicial());
    setEditando(null);
    setAberto(false);
  }

  async function enviarArquivo(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    setEnviandoArquivo(true);

    try {
      const url = await onUpload(arquivo, form.ordem);

      setForm((anterior) => ({
        ...anterior,
        plantaUrl: url,
      }));
    } finally {
      setEnviandoArquivo(false);
      event.target.value = "";
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-slate-900">
            {editando ? "Editar andar" : "Cadastrar andar"}
          </h3>

          <p className="text-sm text-slate-500">
            Configure o bloco 3D e associe a planta arquitetônica.
          </p>
        </div>

        <button
          onClick={limpar}
          className="p-2 rounded-xl hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            Nome do andar
          </label>

          <input
            value={form.nome}
            onChange={(event) =>
              setForm((anterior) => ({
                ...anterior,
                nome: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">
            Ordem
          </label>

          <input
            type="number"
            value={form.ordem}
            onChange={(event) =>
              setForm((anterior) => ({
                ...anterior,
                ordem: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">
            Altura visual
          </label>

          <input
            type="number"
            min="0.1"
            step="0.05"
            value={form.alturaVisual}
            onChange={(event) =>
              setForm((anterior) => ({
                ...anterior,
                alturaVisual: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">
            Categoria
          </label>

          <select
            value={form.categoria}
            onChange={(event) =>
              setForm((anterior) => ({
                ...anterior,
                categoria: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm bg-white"
          >
            {CATEGORIAS.map((categoria) => (
              <option
                key={categoria.id}
                value={categoria.id}
              >
                {categoria.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase">
            Cor
          </label>

          <div className="mt-1 flex gap-2">
            <input
              value={form.cor}
              onChange={(event) =>
                setForm((anterior) => ({
                  ...anterior,
                  cor: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
            />

            <input
              type="color"
              value={form.cor}
              onChange={(event) =>
                setForm((anterior) => ({
                  ...anterior,
                  cor: event.target.value,
                }))
              }
              className="h-12 w-14 rounded-xl border border-slate-200 bg-white"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            Código do projeto
          </label>

          <input
            value={form.codigoProjeto}
            onChange={(event) =>
              setForm((anterior) => ({
                ...anterior,
                codigoProjeto: event.target.value,
              }))
            }
            placeholder="Ex.: 2446-AR-PE-006-R18"
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            Observação
          </label>

          <input
            value={form.observacao}
            onChange={(event) =>
              setForm((anterior) => ({
                ...anterior,
                observacao: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            Destaque
          </label>

          <input
            value={form.destaque}
            onChange={(event) =>
              setForm((anterior) => ({
                ...anterior,
                destaque: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs font-black text-slate-500 uppercase">
            Planta arquitetônica
          </label>

          <div className="mt-1 flex flex-col md:flex-row gap-2">
            <input
              value={form.plantaUrl}
              onChange={(event) =>
                setForm((anterior) => ({
                  ...anterior,
                  plantaUrl: event.target.value,
                }))
              }
              placeholder="URL pública do PDF ou imagem"
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
            />

            <label className="rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 px-4 py-3 font-black hover:bg-blue-100 flex items-center justify-center gap-2 cursor-pointer shrink-0">
              {enviandoArquivo ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <UploadCloud size={18} />
              )}

              {enviandoArquivo
                ? "Enviando..."
                : "Subir planta"}

              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={enviarArquivo}
                disabled={enviandoArquivo}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CORES_PADRAO.map((cor) => (
          <button
            key={cor}
            onClick={() =>
              setForm((anterior) => ({
                ...anterior,
                cor,
              }))
            }
            className="w-8 h-8 rounded-xl border border-slate-200"
            style={{ backgroundColor: cor }}
          />
        ))}
      </div>

      <button
        onClick={() => onSalvar(form, editando, limpar)}
        disabled={
          salvando ||
          enviandoArquivo ||
          !form.nome
        }
        className="mt-5 rounded-2xl bg-blue-600 text-white px-5 py-3 font-black hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {salvando ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Save size={18} />
        )}

        {editando
          ? "Salvar alterações"
          : "Cadastrar andar"}
      </button>
    </div>
  );
}

function FormLocal({
  andarSelecionado,
  editando,
  setEditando,
  onSalvar,
  salvando,
}) {
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
        <MapPin
          className="mx-auto text-slate-300"
          size={36}
        />

        <h3 className="mt-3 font-black text-slate-900">
          Selecione um andar
        </h3>
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
            {editando
              ? "Editar local/equipamento"
              : "Cadastrar local/equipamento"}
          </h3>

          <p className="text-sm text-slate-500">
            Andar selecionado:{" "}
            <strong>{andarSelecionado.nome}</strong>
          </p>
        </div>

        {editando && (
          <button
            onClick={limpar}
            className="p-2 rounded-xl hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={form.nome}
          onChange={(event) =>
            setForm((anterior) => ({
              ...anterior,
              nome: event.target.value,
            }))
          }
          placeholder="Nome do local ou equipamento"
          className="rounded-2xl border border-slate-200 p-3 text-sm"
        />

        <select
          value={form.tipo}
          onChange={(event) =>
            setForm((anterior) => ({
              ...anterior,
              tipo: event.target.value,
            }))
          }
          className="rounded-2xl border border-slate-200 p-3 text-sm bg-white"
        >
          {TIPOS_LOCAL.map((tipo) => (
            <option key={tipo}>{tipo}</option>
          ))}
        </select>

        <input
          value={form.responsavel}
          onChange={(event) =>
            setForm((anterior) => ({
              ...anterior,
              responsavel: event.target.value,
            }))
          }
          placeholder="Responsável"
          className="rounded-2xl border border-slate-200 p-3 text-sm"
        />

        <select
          value={form.status}
          onChange={(event) =>
            setForm((anterior) => ({
              ...anterior,
              status: event.target.value,
            }))
          }
          className="rounded-2xl border border-slate-200 p-3 text-sm bg-white"
        >
          <option>Ativo</option>
          <option>Atenção</option>
          <option>Manutenção</option>
          <option>Inativo</option>
        </select>

        <textarea
          value={form.descricao}
          onChange={(event) =>
            setForm((anterior) => ({
              ...anterior,
              descricao: event.target.value,
            }))
          }
          placeholder="Descrição"
          className="md:col-span-2 rounded-2xl border border-slate-200 p-3 text-sm min-h-[82px]"
        />

        <textarea
          value={form.observacao}
          onChange={(event) =>
            setForm((anterior) => ({
              ...anterior,
              observacao: event.target.value,
            }))
          }
          placeholder="Observações operacionais"
          className="md:col-span-2 rounded-2xl border border-slate-200 p-3 text-sm min-h-[72px]"
        />
      </div>

      <button
        onClick={() => onSalvar(form, editando, limpar)}
        disabled={salvando || !form.nome}
        className="mt-5 rounded-2xl bg-slate-950 text-white px-5 py-3 font-black hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
      >
        {salvando ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Save size={18} />
        )}

        {editando ? "Salvar local" : "Cadastrar local"}
      </button>
    </div>
  );
}

export default function Mapa3D() {
  const [andares, setAndares] = useState([]);
  const [locais, setLocais] = useState([]);
  const [andarSelecionado, setAndarSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [formAndarAberto, setFormAndarAberto] = useState(false);
  const [andarEditando, setAndarEditando] = useState(null);
  const [localEditando, setLocalEditando] = useState(null);
  const [painelAberto, setPainelAberto] = useState(true);
  const [listaAberta, setListaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  const andaresOrdenados = useMemo(
    () => ordenarAndares(andares),
    [andares]
  );

  const locaisSelecionados = useMemo(() => {
    if (!andarSelecionado) return [];

    return locaisDoAndar(locais, andarSelecionado.id);
  }, [locais, andarSelecionado]);

  const tiposDisponiveis = useMemo(() => {
    const tipos = Array.from(
      new Set(locais.map((local) => local.tipo || "Local"))
    );

    return [
      "Todos",
      ...tipos.sort((a, b) => a.localeCompare(b)),
    ];
  }, [locais]);

  const locaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const base =
      filtroTipo === "Todos"
        ? locais
        : locais.filter(
            (local) => local.tipo === filtroTipo
          );

    if (!termo) return base;

    return base.filter((local) =>
      [
        local.nome,
        local.tipo,
        local.descricao,
        local.observacao,
        local.responsavel,
        local.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [locais, busca, filtroTipo]);

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!andarSelecionado && andaresOrdenados.length) {
      setAndarSelecionado(andaresOrdenados[0]);
    }
  }, [andaresOrdenados, andarSelecionado]);

  function limparAvisos() {
    setErro("");
    setMensagem("");
  }

  async function carregar() {
    setCarregando(true);
    limparAvisos();

    try {
      const [listaAndares, listaLocais] =
        await Promise.all([
          listarAndaresMapa3D(),
          listarLocaisMapa3D(),
        ]);

      setAndares(listaAndares);
      setLocais(listaLocais);

      if (listaAndares.length) {
        const atual = listaAndares.find(
          (andar) =>
            andar.id === andarSelecionado?.id
        );

        setAndarSelecionado(
          atual || listaAndares[0]
        );
      }
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível carregar o Mapa 3D. Rode primeiro o SQL enviado."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function sincronizarEstrutura() {
    setSalvando(true);
    limparAvisos();

    try {
      await sincronizarAndaresBaseMapa3D(
        ANDARES_BASE
      );

      await carregar();

      setMensagem(
        "Estrutura arquitetônica sincronizada com sucesso."
      );
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível sincronizar. Rode primeiro o SQL no Supabase."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAndar(form, editando, limpar) {
    setSalvando(true);
    limparAvisos();

    try {
      if (editando) {
        const atualizado =
          await atualizarAndarMapa3D(
            editando.id,
            form
          );

        setAndares((anteriores) =>
          anteriores.map((andar) =>
            andar.id === atualizado.id
              ? atualizado
              : andar
          )
        );

        setAndarSelecionado(atualizado);
      } else {
        const criado =
          await criarAndarMapa3D(form);

        setAndares((anteriores) =>
          ordenarAndares([
            ...anteriores,
            criado,
          ])
        );

        setAndarSelecionado(criado);
      }

      limpar();
      setMensagem("Andar salvo com sucesso.");
    } catch (error) {
      console.error(error);

      setErro("Não foi possível salvar o andar.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarLocal(form, editando, limpar) {
    if (!andarSelecionado) return;

    setSalvando(true);
    limparAvisos();

    try {
      if (editando) {
        const atualizado =
          await atualizarLocalMapa3D(
            editando.id,
            {
              ...form,
              andarId: andarSelecionado.id,
            }
          );

        setLocais((anteriores) =>
          anteriores.map((local) =>
            local.id === atualizado.id
              ? atualizado
              : local
          )
        );
      } else {
        const criado =
          await criarLocalMapa3D({
            ...form,
            andarId: andarSelecionado.id,
          });

        setLocais((anteriores) => [
          criado,
          ...anteriores,
        ]);
      }

      limpar();

      setMensagem(
        "Local ou equipamento salvo com sucesso."
      );
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível salvar o local ou equipamento."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerLocal(local) {
    const confirmar = window.confirm(
      `Deseja excluir "${local.nome}"?`
    );

    if (!confirmar) return;

    await excluirLocalMapa3D(local.id);

    setLocais((anteriores) =>
      anteriores.filter(
        (item) => item.id !== local.id
      )
    );
  }

  async function removerAndar(andar) {
    const confirmar = window.confirm(
      `Deseja excluir o andar "${andar.nome}"?`
    );

    if (!confirmar) return;

    await excluirAndarMapa3D(andar.id);

    setAndarSelecionado(null);

    await carregar();
  }

  async function enviarPlanta(
    arquivo,
    ordem
  ) {
    limparAvisos();

    try {
      const url =
        await uploadPlantaAndarMapa3D(
          arquivo,
          ordem
        );

      setMensagem(
        "Planta enviada. Agora clique em salvar alterações."
      );

      return url;
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível subir a planta. Confira o bucket mapa3d-plantas."
      );

      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <Building2
                size={34}
                className="text-cyan-300"
              />

              <div>
                <p className="text-cyan-200 font-semibold">
                  Edifício JK 1455
                </p>

                <h1 className="text-3xl font-black">
                  Mapa 3D Arquitetônico
                </h1>
              </div>
            </div>

            <p className="text-slate-300 mt-3 max-w-3xl">
              Modelo paramétrico com subsolos,
              implantação, torre comercial,
              pavimentos técnicos, cobertura,
              casa de máquinas e heliponto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={carregar}
              className="rounded-2xl bg-white/10 px-4 py-3 font-bold flex gap-2 items-center"
            >
              <RefreshCcw size={18} />
              Atualizar
            </button>

            <button
              onClick={sincronizarEstrutura}
              disabled={salvando}
              className="rounded-2xl bg-white/10 px-4 py-3 font-bold flex gap-2 items-center disabled:opacity-50"
            >
              <Layers3 size={18} />
              Sincronizar estrutura
            </button>

            <button
              onClick={() =>
                setFormAndarAberto(true)
              }
              className="rounded-2xl bg-cyan-400 text-slate-950 px-4 py-3 font-black flex gap-2 items-center"
            >
              <Plus size={18} />
              Cadastrar andar
            </button>
          </div>
        </div>
      </section>

      {erro && (
        <div className="rounded-3xl bg-amber-50 border border-amber-100 text-amber-800 p-4 flex gap-2">
          <AlertTriangle size={18} />
          {erro}
        </div>
      )}

      {mensagem && (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-800 p-4">
          {mensagem}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardInfo
          titulo="Andares"
          valor={andares.length}
          subtitulo="Pavimentos clicáveis"
          icon={Layers3}
        />

        <CardInfo
          titulo="Locais"
          valor={locais.length}
          subtitulo="Registros no Supabase"
          icon={MapPin}
          cor="green"
        />

        <CardInfo
          titulo="Selecionado"
          valor={andarSelecionado?.nome || "-"}
          subtitulo={`${locaisSelecionados.length} local(is)`}
          icon={Eye}
          cor="purple"
        />
      </div>

      {carregando ? (
        <div className="p-10 text-center">
          <Loader2
            className="animate-spin mx-auto"
          />
        </div>
      ) : andares.length === 0 ? (
        <button
          onClick={sincronizarEstrutura}
          className="rounded-2xl bg-blue-600 text-white px-5 py-3 font-black"
        >
          Criar estrutura base
        </button>
      ) : (
        <div
          className={`grid grid-cols-1 ${
            painelAberto
              ? "2xl:grid-cols-[1.45fr_0.9fr]"
              : "2xl:grid-cols-1"
          } gap-6`}
        >
          <section className="bg-white rounded-[2rem] overflow-hidden border border-slate-100">
            <div className="p-4 flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  Visualização 3D
                </h2>

                <p className="text-sm text-slate-500">
                  Gire, aproxime e clique nos andares.
                </p>
              </div>

              <button
                onClick={() =>
                  setPainelAberto((valor) => !valor)
                }
                className="rounded-xl border px-3 py-2 font-bold flex gap-2 items-center"
              >
                {painelAberto ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}

                {painelAberto
                  ? "Minimizar"
                  : "Abrir painel"}
              </button>
            </div>

            <div className="h-[820px] bg-gradient-to-b from-slate-100 via-blue-50 to-slate-200">
              <Canvas shadows>
                <PerspectiveCamera
                  makeDefault
                  position={[15, 13, 23]}
                  fov={54}
                />

                <ambientLight intensity={0.7} />

                <directionalLight
                  position={[8, 11, 7]}
                  intensity={1.3}
                  castShadow
                />

                <Predio3D
                  andares={andaresOrdenados}
                  locais={locais}
                  andarSelecionado={
                    andarSelecionado
                  }
                  setAndarSelecionado={
                    setAndarSelecionado
                  }
                />

                <ContactShadows
                  opacity={0.3}
                  scale={16}
                  blur={2.8}
                  far={7}
                  position={[0, -3.08, 0]}
                />

                <Environment preset="city" />

                <OrbitControls
                  enablePan
                  enableZoom
                  enableRotate
                  minDistance={6}
                  maxDistance={68}
                  target={[0, 3.3, 0]}
                />
              </Canvas>
            </div>
          </section>

          {painelAberto && (
            <section className="space-y-6">
              <div className="bg-white rounded-[2rem] border border-slate-100 p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase">
                      Andar selecionado
                    </p>

                    <h2 className="text-2xl font-black">
                      {andarSelecionado?.nome}
                    </h2>

                    <p className="text-sm text-slate-500">
                      {andarSelecionado?.observacao}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setAndarEditando(
                          andarSelecionado
                        )
                      }
                      className="p-2"
                    >
                      <Edit3 size={18} />
                    </button>

                    <button
                      onClick={() =>
                        removerAndar(
                          andarSelecionado
                        )
                      }
                      className="p-2 text-rose-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {EMPRESAS_POR_ANDAR[
                  Number(
                    andarSelecionado?.ordem
                  )
                ] && (
                  <div className="mt-4 rounded-2xl bg-purple-50 p-3">
                    <p className="font-black text-purple-900">
                      {
                        EMPRESAS_POR_ANDAR[
                          Number(
                            andarSelecionado?.ordem
                          )
                        ]
                      }
                    </p>
                  </div>
                )}

                <VisualizadorPlanta
                  andar={andarSelecionado}
                />

                <div className="mt-4 rounded-3xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 font-black flex gap-2">
                    <Info size={17} />
                    O que tem neste andar
                  </div>

                  {locaisSelecionados.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400">
                      Nenhum local cadastrado.
                    </div>
                  ) : (
                    locaisSelecionados.map((local) => (
                      <div
                        key={local.id}
                        className="p-4 border-t"
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-black">
                              {local.nome}
                            </p>

                            <Badge
                              color={corBadgePorTipo(
                                local.tipo
                              )}
                            >
                              {local.tipo}
                            </Badge>
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setLocalEditando(
                                  local
                                )
                              }
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              onClick={() =>
                                removerLocal(local)
                              }
                              className="text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <FormLocal
                andarSelecionado={
                  andarSelecionado
                }
                editando={localEditando}
                setEditando={setLocalEditando}
                onSalvar={salvarLocal}
                salvando={salvando}
              />
            </section>
          )}
        </div>
      )}

      <FormAndar
        aberto={formAndarAberto}
        setAberto={setFormAndarAberto}
        editando={andarEditando}
        setEditando={setAndarEditando}
        onSalvar={salvarAndar}
        salvando={salvando}
        onUpload={enviarPlanta}
      />

      {andares.length > 0 && (
        <section className="bg-white rounded-[2rem] border border-slate-100 p-5">
          <div className="flex justify-between gap-3">
            <div>
              <h3 className="font-black">
                Lista geral
              </h3>

              <p className="text-sm text-slate-500">
                Consulte todos os locais cadastrados.
              </p>
            </div>

            <button
              onClick={() =>
                setListaAberta((valor) => !valor)
              }
              className="rounded-xl bg-slate-950 text-white px-4 py-2 flex gap-2 items-center"
            >
              {listaAberta ? (
                <ChevronUp size={17} />
              ) : (
                <ChevronDown size={17} />
              )}

              {listaAberta
                ? "Fechar"
                : "Abrir lista"}
            </button>
          </div>

          {listaAberta && (
            <>
              <div className="mt-4 flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Filter
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={filtroTipo}
                    onChange={(event) =>
                      setFiltroTipo(
                        event.target.value
                      )
                    }
                    className="pl-9 p-3 rounded-2xl border"
                  >
                    {tiposDisponiveis.map(
                      (tipo) => (
                        <option key={tipo}>
                          {tipo}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <input
                  value={busca}
                  onChange={(event) =>
                    setBusca(event.target.value)
                  }
                  placeholder="Buscar"
                  className="p-3 rounded-2xl border w-full"
                />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="p-3">
                        Nome
                      </th>

                      <th className="p-3">
                        Andar
                      </th>

                      <th className="p-3">
                        Tipo
                      </th>

                      <th className="p-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {locaisFiltrados.map(
                      (local) => {
                        const andar =
                          andares.find(
                            (item) =>
                              item.id ===
                              local.andarId
                          );

                        return (
                          <tr
                            key={local.id}
                            className="border-t"
                          >
                            <td className="p-3 font-bold">
                              {local.nome}
                            </td>

                            <td className="p-3">
                              {andar?.nome || "-"}
                            </td>

                            <td className="p-3">
                              {local.tipo}
                            </td>

                            <td className="p-3">
                              {local.status}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
