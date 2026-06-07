import {
  AlertTriangle,
  Building2,
  Camera,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  FileText,
  ImagePlus,
  Layers3,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  MousePointer2,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings2,
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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  atualizarAndarMapa3D,
  atualizarItemExternoMapa3D,
  atualizarLocalMapa3D,
  criarAndarMapa3D,
  criarArquivoMapa3D,
  criarItemExternoMapa3D,
  criarLocalMapa3D,
  excluirAndarMapa3D,
  excluirArquivoProtegidoMapa3D,
  excluirItemExternoMapa3D,
  excluirLocalMapa3D,
  listarAndaresMapa3D,
  listarArquivosMapa3DPorEntidade,
  listarItensExternosMapa3D,
  listarLocaisMapa3D,
} from "../services/mapa3dSupabaseService";

/**
 * MAPA 3D JK 1455 — V12
 *
 * Fachada:
 * térreo em pedra;
 * 1º e 2º pavimentos técnicos em pedra nos quatro lados;
 * 3º andar em vidro com molduras e pilastras de pedra nos quatro lados;
 * 4º ao 12º andar espelhados;
 * sem identificação de 13º andar;
 * 14º e 15º andar espelhados;
 * 16º andar Ferrero em vidro com molduras e pilastras nos quatro lados;
 * três níveis técnicos superiores em pedra;
 * heliponto separado.
 */

const CAMADAS = [
  {
    id: "geral",
    nome: "Visão geral",
  },
  {
    id: "andares",
    nome: "Pavimentos",
  },
  {
    id: "subsolos",
    nome: "Subsolos",
  },
  {
    id: "externas",
    nome: "Áreas externas",
  },
  {
    id: "sistemas",
    nome: "Sistemas prediais",
  },
];

const TIPOS_LOCAL = [
  "Locatário",
  "Administrativo",
  "Técnico",
  "Equipamento",
  "Elétrica",
  "Hidráulica",
  "Ar-condicionado",
  "Segurança",
  "Operação",
  "Outro",
];

const CATEGORIAS_ITEM = [
  "Operação",
  "Elétrica",
  "Hidráulica",
  "Gás",
  "Esgoto",
  "Segurança",
  "Estrutural",
  "Outro",
];

const LADOS_EXTERNOS = [
  {
    value: "frente",
    label: "Frente",
  },
  {
    value: "fundos",
    label: "Fundos",
  },
  {
    value: "esquerda",
    label: "Lateral esquerda",
  },
  {
    value: "direita",
    label: "Lateral direita",
  },
  {
    value: "centro",
    label: "Centro do lote",
  },
];

const TIPOS_VISUAIS = [
  {
    value: "casinha",
    label: "Casinha / cubículo",
  },
  {
    value: "redondo",
    label: "Redondo / tampa",
  },
  {
    value: "retangular",
    label: "Retangular / caixa",
  },
  {
    value: "poste",
    label: "Poste",
  },
  {
    value: "equipamento",
    label: "Equipamento técnico",
  },
];

const MODOS_IMPLANTACAO = [
  {
    value: "superficie",
    label: "Construção para fora",
  },
  {
    value: "subterraneo",
    label: "Dentro da terra / subterrâneo",
  },
];

function ordenarAndares(andares = []) {
  return [...andares].sort(
    (a, b) =>
      Number(a.ordem || 0) -
      Number(b.ordem || 0)
  );
}

function ordenarItens(itens = []) {
  return [...itens].sort(
    (a, b) =>
      Number(a.ordem || 0) -
      Number(b.ordem || 0)
  );
}

function locaisDoAndar(
  locais,
  andarId
) {
  return locais.filter(
    (local) =>
      local.andarId === andarId
  );
}

function itemEhEstacionamento(item) {
  return (
    item?.nome
      ?.trim()
      .toLowerCase() ===
    "estacionamento externo"
  );
}

function andarVazio() {
  return {
    id: "",
    nome: "",
    ordem: 0,
    altura: 3,
    cor: "#2563eb",
    observacao: "",
    categoria: "comercial",
    tituloCurto: "",
    mostrarRotulo: true,
  };
}

function localVazio(andarId = "") {
  return {
    id: "",
    andarId,
    nome: "",
    tipo: "Locatário",
    descricao: "",
    observacao: "",
    responsavel: "",
    status: "Ativo",
  };
}

function itemExternoVazio() {
  return {
    id: "",
    nome: "",
    categoria: "Operação",
    lado: "frente",
    tipoVisual: "retangular",
    modoImplantacao: "superficie",
    descricao: "",
    observacao: "",
    status: "Ativo",
    cor: "#64748b",
    x: 0,
    y: 0.1,
    z: 0,
    largura: 0.8,
    altura: 0.6,
    profundidade: 0.8,
    ordem: 99,
  };
}

// =========================================================
// COMPONENTES 3D BÁSICOS
// =========================================================

function Box({
  position,
  size,
  color,
  opacity = 1,
  roughness = 0.5,
  metalness = 0.05,
  onClick,
}) {
  return (
    <mesh
      position={position}
      castShadow
      receiveShadow
      onClick={onClick}
    >
      <boxGeometry args={size} />

      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}

function GlassBox({
  position,
  size,
  color = "#0f5265",
}) {
  return (
    <mesh
      position={position}
      castShadow
      receiveShadow
    >
      <boxGeometry args={size} />

      <meshPhysicalMaterial
        color={color}
        roughness={0.08}
        metalness={0.42}
        transmission={0.08}
        thickness={0.3}
        clearcoat={0.9}
        clearcoatRoughness={0.1}
        reflectivity={0.95}
      />
    </mesh>
  );
}

function Linha({
  position,
  size,
  color = "#d6c7aa",
}) {
  return (
    <Box
      position={position}
      size={size}
      color={color}
      roughness={0.6}
    />
  );
}

function Label({
  position,
  titulo,
  subtitulo,
  ativo = false,
  onClick,
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={18}
      zIndexRange={[100, 0]}
    >
      <button
        type="button"
        onClick={onClick}
        className={`min-w-[118px] rounded-2xl border px-3 py-2 text-left shadow-lg backdrop-blur ${
          ativo
            ? "border-cyan-300 bg-cyan-500 text-white"
            : "border-slate-200 bg-white/95 text-slate-800"
        }`}
      >
        <span className="block text-[11px] font-black leading-tight">
          {titulo}
        </span>

        {subtitulo && (
          <span
            className={`mt-0.5 block text-[9px] font-bold ${
              ativo
                ? "text-cyan-50"
                : "text-slate-400"
            }`}
          >
            {subtitulo}
          </span>
        )}
      </button>
    </Html>
  );
}

function PilastrasQuatroLados({
  largura,
  profundidade,
  y,
  altura,
  cor = "#d8ccb6",
  quantidadeFrente = 11,
  quantidadeLateral = 9,
  espessura = 0.13,
  afastamento = 0.07,
  onClick,
}) {
  const frente =
    Array.from(
      {
        length: quantidadeFrente,
      },
      (_, index) =>
        -largura / 2 +
        (index * largura) /
          Math.max(
            1,
            quantidadeFrente - 1
          )
    );

  const lateral =
    Array.from(
      {
        length: quantidadeLateral,
      },
      (_, index) =>
        -profundidade / 2 +
        (index * profundidade) /
          Math.max(
            1,
            quantidadeLateral - 1
          )
    );

  return (
    <group>
      {frente.map((x) => (
        <group key={`frente-${x}`}>
          <Box
            position={[
              x,
              y,
              profundidade / 2 +
                afastamento,
            ]}
            size={[
              espessura,
              altura,
              espessura,
            ]}
            color={cor}
            roughness={0.82}
            onClick={onClick}
          />

          <Box
            position={[
              x,
              y,
              -profundidade / 2 -
                afastamento,
            ]}
            size={[
              espessura,
              altura,
              espessura,
            ]}
            color={cor}
            roughness={0.82}
            onClick={onClick}
          />
        </group>
      ))}

      {lateral.map((z) => (
        <group key={`lateral-${z}`}>
          <Box
            position={[
              largura / 2 +
                afastamento,
              y,
              z,
            ]}
            size={[
              espessura,
              altura,
              espessura,
            ]}
            color={cor}
            roughness={0.82}
            onClick={onClick}
          />

          <Box
            position={[
              -largura / 2 -
                afastamento,
              y,
              z,
            ]}
            size={[
              espessura,
              altura,
              espessura,
            ]}
            color={cor}
            roughness={0.82}
            onClick={onClick}
          />
        </group>
      ))}
    </group>
  );
}

function MoldurasHorizontais({
  largura,
  profundidade,
  y,
  altura,
  cor = "#c6b79f",
}) {
  return (
    <group>
      <Linha
        position={[
          0,
          y - altura / 2 - 0.06,
          0,
        ]}
        size={[
          largura + 0.54,
          0.12,
          profundidade + 0.52,
        ]}
        color={cor}
      />

      <Linha
        position={[
          0,
          y + altura / 2 + 0.06,
          0,
        ]}
        size={[
          largura + 0.54,
          0.12,
          profundidade + 0.52,
        ]}
        color={cor}
      />
    </group>
  );
}

function PavimentoPedra({
  andar,
  y,
  largura = 9.25,
  profundidade = 7.64,
  altura = 0.76,
  selecionado,
  onSelect,
}) {
  function clicar(event) {
    event.stopPropagation();

    if (andar) {
      onSelect(andar);
    }
  }

  return (
    <group>
      <Box
        position={[0, y, 0]}
        size={[
          largura,
          altura,
          profundidade,
        ]}
        color={
          selecionado
            ? "#eee4d5"
            : "#d8ccb6"
        }
        roughness={0.86}
        onClick={clicar}
      />

      <PilastrasQuatroLados
        largura={largura}
        profundidade={profundidade}
        y={y}
        altura={altura * 0.68}
        cor="#b9aa92"
        quantidadeFrente={8}
        quantidadeLateral={7}
        espessura={0.035}
        afastamento={0.025}
        onClick={clicar}
      />

      <MoldurasHorizontais
        largura={largura}
        profundidade={profundidade}
        y={y}
        altura={altura}
      />
    </group>
  );
}

function PavimentoVidroComPedra({
  andar,
  y,
  largura = 9.12,
  profundidade = 7.52,
  altura = 1,
  selecionado,
  titulo,
  subtitulo,
  onSelect,
}) {
  function clicar(event) {
    event.stopPropagation();

    if (andar) {
      onSelect(andar);
    }
  }

  return (
    <group>
      <GlassBox
        position={[0, y, 0]}
        size={[
          largura,
          altura,
          profundidade,
        ]}
        color="#176378"
      />

      {andar && (
        <Box
          position={[0, y, 0]}
          size={[
            largura + 0.05,
            altura + 0.05,
            profundidade + 0.05,
          ]}
          color={
            selecionado
              ? "#22d3ee"
              : "#176378"
          }
          opacity={
            selecionado
              ? 0.42
              : 0.02
          }
          metalness={0.64}
          roughness={0.12}
          onClick={clicar}
        />
      )}

      <PilastrasQuatroLados
        largura={largura}
        profundidade={profundidade}
        y={y}
        altura={altura + 0.08}
        cor="#d8ccb6"
        quantidadeFrente={11}
        quantidadeLateral={9}
        espessura={0.14}
        afastamento={0.07}
        onClick={clicar}
      />

      <MoldurasHorizontais
        largura={largura}
        profundidade={profundidade}
        y={y}
        altura={altura}
        cor="#c8baa2"
      />

      {selecionado && (
        <Label
          position={[
            6.1,
            y,
            0.45,
          ]}
          titulo={titulo}
          subtitulo={subtitulo}
          ativo
          onClick={() =>
            andar &&
            onSelect(andar)
          }
        />
      )}
    </group>
  );
}

// =========================================================
// ÁREA EXTERNA
// =========================================================

function GradeRua() {
  return (
    <group>
      <Box
        position={[0, -0.18, 0]}
        size={[18, 0.3, 16]}
        color="#cbd5e1"
        roughness={0.9}
      />

      <Box
        position={[0, 0.005, 0]}
        size={[17.65, 0.06, 15.65]}
        color="#dce6ed"
        roughness={0.92}
      />

      <Box
        position={[0, 0.01, 7.1]}
        size={[18, 0.08, 1.5]}
        color="#475569"
        roughness={0.96}
      />

      <Box
        position={[6.05, 0.05, -0.25]}
        size={[2.2, 0.07, 11]}
        color="#64748b"
        roughness={0.95}
      />

      <Box
        position={[3.65, 0.055, -5.4]}
        size={[7.2, 0.075, 3.6]}
        color="#64748b"
        roughness={0.95}
      />
    </group>
  );
}

function Carro({
  position,
  color = "#1e293b",
}) {
  return (
    <group position={position}>
      <Box
        position={[0, 0.15, 0]}
        size={[0.56, 0.2, 1.02]}
        color={color}
        roughness={0.38}
        metalness={0.42}
      />

      <Box
        position={[0, 0.31, -0.03]}
        size={[0.44, 0.16, 0.58]}
        color="#64748b"
        roughness={0.15}
        metalness={0.58}
      />
    </group>
  );
}

function Vaga({
  x,
  z,
  ocupada = false,
}) {
  return (
    <group position={[x, 0.11, z]}>
      <Box
        position={[0, 0, 0]}
        size={[0.05, 0.035, 1.15]}
        color="#f8fafc"
      />

      <Box
        position={[0.82, 0, 0]}
        size={[0.05, 0.035, 1.15]}
        color="#f8fafc"
      />

      {ocupada && (
        <Carro
          position={[0.4, 0.02, 0]}
        />
      )}
    </group>
  );
}

function EstacionamentoFundos({
  item,
  selecionado,
  onSelect,
}) {
  return (
    <group>
      {Array.from(
        {
          length: 7,
        },
        (_, index) => (
          <Vaga
            key={`vaga-a-${index}`}
            x={1.1 + index * 0.83}
            z={-6.08}
            ocupada={index % 3 === 0}
          />
        )
      )}

      {Array.from(
        {
          length: 7,
        },
        (_, index) => (
          <Vaga
            key={`vaga-b-${index}`}
            x={1.1 + index * 0.83}
            z={-4.82}
            ocupada={index % 4 === 1}
          />
        )
      )}

      <Label
        position={[4.8, 0.55, -6.9]}
        titulo="Estacionamento externo"
        subtitulo="Fundos do edifício"
        ativo={selecionado}
        onClick={() =>
          item && onSelect(item)
        }
      />
    </group>
  );
}

function Fonte({
  position,
  escala = 1,
}) {
  return (
    <group
      position={position}
      scale={[escala, escala, escala]}
    >
      <mesh
        position={[0, 0.04, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[0.62, 0.7, 0.16, 36]}
        />

        <meshStandardMaterial
          color="#d7c8ae"
          roughness={0.78}
        />
      </mesh>

      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry
          args={[0.49, 0.52, 0.08, 36]}
        />

        <meshStandardMaterial
          color="#7dd3fc"
          roughness={0.28}
        />
      </mesh>

      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry
          args={[0.07, 0.09, 0.62, 18]}
        />

        <meshStandardMaterial
          color="#d7c8ae"
        />
      </mesh>
    </group>
  );
}

function Arvore({
  position,
}) {
  return (
    <group position={position}>
      <Box
        position={[0, 0.26, 0]}
        size={[0.1, 0.52, 0.1]}
        color="#7c5a3c"
      />

      <mesh
        position={[0, 0.72, 0]}
        castShadow
      >
        <sphereGeometry
          args={[0.32, 16, 16]}
        />

        <meshStandardMaterial
          color="#2f6f45"
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}

function Paisagismo() {
  return (
    <group>
      <Fonte
        position={[-2.85, 0.14, 4.95]}
        escala={0.78}
      />

      <Fonte
        position={[0, 0.14, 5.12]}
        escala={0.9}
      />

      <Fonte
        position={[2.85, 0.14, 4.95]}
        escala={0.78}
      />

      {[
        -4.8,
        -4.1,
        -3.4,
        -2.7,
        2.7,
        3.4,
        4.1,
        4.8,
      ].map((x) => (
        <Arvore
          key={x}
          position={[x, 0.12, 5.3]}
        />
      ))}
    </group>
  );
}

// =========================================================
// ITENS EXTERNOS
// =========================================================

function posicaoItem(item) {
  const x = Number(item.x || 0);
  const y = Number(item.y || 0);
  const z = Number(item.z || 0);

  if (item.lado === "fundos") {
    return [x, y, -4.6 + z];
  }

  if (item.lado === "esquerda") {
    return [-5.7 + x, y, z];
  }

  if (item.lado === "direita") {
    return [7.1 + x, y, z];
  }

  if (item.lado === "centro") {
    return [x, y, z];
  }

  return [x, y, 5.25 + z];
}

function offsetsPorClique(
  lado,
  ponto
) {
  const x =
    Number(ponto.x.toFixed(2));

  const z =
    Number(ponto.z.toFixed(2));

  if (lado === "fundos") {
    return {
      x,
      y: 0.1,
      z: Number(
        (z + 4.6).toFixed(2)
      ),
    };
  }

  if (lado === "esquerda") {
    return {
      x: Number(
        (x + 5.7).toFixed(2)
      ),
      y: 0.1,
      z,
    };
  }

  if (lado === "direita") {
    return {
      x: Number(
        (x - 7.1).toFixed(2)
      ),
      y: 0.1,
      z,
    };
  }

  return {
    x,
    y: 0.1,
    z,
  };
}

function ItemExternoVisual({
  item,
  selecionado,
  onSelect,
}) {
  if (itemEhEstacionamento(item)) {
    return null;
  }

  const [x, yBase, z] =
    posicaoItem(item);

  const subterraneo =
    item.modoImplantacao ===
    "subterraneo";

  const largura =
    Math.max(
      0.18,
      Number(item.largura || 0.8)
    );

  const altura =
    Math.max(
      0.12,
      Number(item.altura || 0.6)
    );

  const profundidade =
    Math.max(
      0.18,
      Number(item.profundidade || 0.8)
    );

  const y =
    subterraneo
      ? -0.04
      : yBase + altura / 2;

  function clicar(event) {
    event.stopPropagation();

    onSelect(item);
  }

  return (
    <group position={[x, y, z]}>
      {item.tipoVisual ===
      "redondo" ? (
        <mesh
          onClick={clicar}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              largura / 2,
              largura / 2,
              subterraneo
                ? 0.08
                : altura,
              32,
            ]}
          />

          <meshStandardMaterial
            color={
              item.cor || "#64748b"
            }
            roughness={0.68}
          />
        </mesh>
      ) : item.tipoVisual ===
        "poste" ? (
        <mesh
          onClick={clicar}
          position={[0, altura / 2, 0]}
          castShadow
        >
          <cylinderGeometry
            args={[
              Math.max(
                0.05,
                largura / 7
              ),
              Math.max(
                0.05,
                largura / 7
              ),
              altura,
              20,
            ]}
          />

          <meshStandardMaterial
            color={
              item.cor || "#64748b"
            }
          />
        </mesh>
      ) : (
        <Box
          position={[0, 0, 0]}
          size={[
            largura,
            subterraneo
              ? 0.09
              : altura,
            profundidade,
          ]}
          color={
            item.cor || "#64748b"
          }
          roughness={0.74}
          onClick={clicar}
        />
      )}

      <Label
        position={[
          0,
          subterraneo
            ? 0.42
            : altura / 2 + 0.55,
          0,
        ]}
        titulo={item.nome}
        subtitulo={`${item.lado} • ${
          subterraneo
            ? "subterrâneo"
            : "superfície"
        }`}
        ativo={selecionado}
        onClick={() =>
          onSelect(item)
        }
      />
    </group>
  );
}

function PlanoPosicionamento({
  ativo,
  lado,
  onEscolher,
}) {
  if (!ativo) return null;

  return (
    <mesh
      position={[0, 0.13, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(event) => {
        event.stopPropagation();

        onEscolher(
          offsetsPorClique(
            lado,
            event.point
          )
        );
      }}
    >
      <planeGeometry args={[17.2, 15.2]} />

      <meshStandardMaterial
        color="#38bdf8"
        transparent
        opacity={0.18}
      />
    </mesh>
  );
}

// =========================================================
// EDIFÍCIO
// =========================================================

function Embasamento({
  terreo,
  selecionado,
  onSelect,
  camada,
}) {
  if (camada === "subsolos") {
    return null;
  }

  return (
    <group>
      <Box
        position={[0, 0.78, 0]}
        size={[9.4, 1.55, 7.7]}
        color={
          selecionado
            ? "#67e8f9"
            : "#ded3bd"
        }
        roughness={0.72}
        onClick={(event) => {
          event.stopPropagation();

          if (terreo) {
            onSelect(terreo);
          }
        }}
      />

      <Linha
        position={[0, 0.22, 0]}
        size={[9.7, 0.14, 7.92]}
      />

      <Linha
        position={[0, 1.42, 0]}
        size={[9.75, 0.14, 7.95]}
      />

      <Box
        position={[0, 0.7, 4.12]}
        size={[2.6, 1.25, 0.68]}
        color="#d8ccb6"
      />

      <Box
        position={[0, 0.72, 4.48]}
        size={[1.35, 0.9, 0.08]}
        color="#17353c"
      />

      <Label
        position={[-4.6, 1.65, 4.4]}
        titulo="Térreo"
        subtitulo="Acesso principal"
        ativo={selecionado}
        onClick={() =>
          terreo &&
          onSelect(terreo)
        }
      />
    </group>
  );
}

function TorrePrincipal({
  andares,
  selecionado,
  onSelect,
  camada,
}) {
  if (camada === "subsolos") {
    return null;
  }

  const largura = 8.7;
  const profundidade = 7.1;

  const primeiroTecnico =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 1
    );

  const segundoTecnico =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 2
    );

  const terceiro =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 3
    );

  const ferrero =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 16
    );

  const corporativos =
    andares.filter((andar) => {
      const ordem =
        Number(andar.ordem);

      return (
        ordem >= 4 &&
        ordem <= 15 &&
        ordem !== 13
      );
    });

  const tecnico1Y = 1.95;
  const tecnico2Y = 2.8;
  const terceiroY = 3.83;

  const baseVidroY = 4.42;
  const alturaPiso = 0.64;

  const alturaVidro =
    corporativos.length *
    alturaPiso;

  const topoVidroY =
    baseVidroY + alturaVidro;

  const ferreroY =
    topoVidroY + 0.62;

  return (
    <group>
      <PavimentoPedra
        andar={primeiroTecnico}
        y={tecnico1Y}
        selecionado={
          selecionado?.id ===
          primeiroTecnico?.id
        }
        onSelect={onSelect}
      />

      <PavimentoPedra
        andar={segundoTecnico}
        y={tecnico2Y}
        selecionado={
          selecionado?.id ===
          segundoTecnico?.id
        }
        onSelect={onSelect}
      />

      <PavimentoVidroComPedra
        andar={terceiro}
        y={terceiroY}
        selecionado={
          selecionado?.id ===
          terceiro?.id
        }
        titulo="3º Andar"
        subtitulo="Vidro com pilastras de pedra"
        onSelect={onSelect}
      />

      <GlassBox
        position={[
          0,
          baseVidroY +
            alturaVidro / 2,
          0,
        ]}
        size={[
          largura,
          alturaVidro,
          profundidade,
        ]}
        color="#0f5265"
      />

      {Array.from(
        {
          length: 14,
        },
        (_, index) => {
          const x =
            -largura / 2 +
            (index * largura) / 13;

          return (
            <Linha
              key={`vidro-frente-${index}`}
              position={[
                x,
                baseVidroY +
                  alturaVidro / 2,
                profundidade / 2 +
                  0.012,
              ]}
              size={[
                0.025,
                alturaVidro,
                0.03,
              ]}
              color="#7996a0"
            />
          );
        }
      )}

      {Array.from(
        {
          length: 10,
        },
        (_, index) => {
          const z =
            -profundidade / 2 +
            (index * profundidade) / 9;

          return (
            <Linha
              key={`vidro-lateral-${index}`}
              position={[
                largura / 2 +
                  0.012,
                baseVidroY +
                  alturaVidro / 2,
                z,
              ]}
              size={[
                0.03,
                alturaVidro,
                0.025,
              ]}
              color="#7996a0"
            />
          );
        }
      )}

      {corporativos.map(
        (andar, index) => {
          const y =
            baseVidroY +
            index * alturaPiso +
            alturaPiso / 2;

          const ativo =
            selecionado?.id ===
            andar.id;

          return (
            <group key={andar.id}>
              <Box
                position={[0, y, 0]}
                size={[
                  largura + 0.05,
                  alturaPiso * 0.94,
                  profundidade + 0.05,
                ]}
                color={
                  ativo
                    ? "#22d3ee"
                    : "#0f5265"
                }
                opacity={
                  ativo
                    ? 0.52
                    : 0.02
                }
                metalness={0.7}
                roughness={0.1}
                onClick={(event) => {
                  event.stopPropagation();

                  onSelect(andar);
                }}
              />

              <Linha
                position={[
                  0,
                  baseVidroY +
                    index * alturaPiso,
                  profundidade / 2 +
                    0.035,
                ]}
                size={[
                  largura,
                  0.018,
                  0.035,
                ]}
                color="#9db7be"
              />
            </group>
          );
        }
      )}

      <Linha
        position={[0, topoVidroY + 0.04, 0]}
        size={[
          largura + 0.72,
          0.16,
          profundidade + 0.68,
        ]}
        color="#c8baa2"
      />

      <PavimentoVidroComPedra
        andar={ferrero}
        y={ferreroY}
        selecionado={
          selecionado?.id ===
          ferrero?.id
        }
        titulo="16º Andar — Ferrero"
        subtitulo="Último pavimento comercial"
        onSelect={onSelect}
      />
    </group>
  );
}

function AreasTecnicasSuperiores({
  andares,
  selecionado,
  onSelect,
  camada,
}) {
  if (camada === "subsolos") {
    return null;
  }

  const torres =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 17
    );

  const poco =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 18
    );

  const casa =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 19
    );

  const heliponto =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 20
    );

  const baseY = 12.74;
  const distancia = 0.8;

  const niveis = [
    {
      andar: torres,
      y: baseY,
      titulo: "Torres de resfriamento",
    },
    {
      andar: poco,
      y: baseY + distancia,
      titulo: "Poço dos elevadores",
    },
    {
      andar: casa,
      y: baseY + distancia * 2,
      titulo: "Casa de máquinas",
    },
  ].filter(
    (nivel) =>
      Boolean(nivel.andar)
  );

  const helipontoY =
    baseY + distancia * 3 + 0.26;

  return (
    <group>
      {niveis.map((nivel) => (
        <group key={nivel.andar.id}>
          <PavimentoPedra
            andar={nivel.andar}
            y={nivel.y}
            largura={9.52}
            profundidade={7.94}
            altura={0.7}
            selecionado={
              selecionado?.id ===
              nivel.andar.id
            }
            onSelect={onSelect}
          />

          {selecionado?.id ===
            nivel.andar.id && (
            <Label
              position={[
                6.15,
                nivel.y,
                0.35,
              ]}
              titulo={nivel.titulo}
              subtitulo="Área técnica superior"
              ativo
              onClick={() =>
                onSelect(nivel.andar)
              }
            />
          )}
        </group>
      ))}

      <Linha
        position={[
          0,
          helipontoY - 0.2,
          0,
        ]}
        size={[
          10.45,
          0.24,
          8.72,
        ]}
        color="#c3b298"
      />

      <Box
        position={[0, helipontoY, 0]}
        size={[9.42, 0.18, 7.82]}
        color={
          selecionado?.id ===
          heliponto?.id
            ? "#76b8cb"
            : "#4d91a7"
        }
        roughness={0.62}
        onClick={(event) => {
          event.stopPropagation();

          if (heliponto) {
            onSelect(heliponto);
          }
        }}
      />

      <mesh
        position={[
          0,
          helipontoY + 0.1,
          0,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();

          if (heliponto) {
            onSelect(heliponto);
          }
        }}
      >
        <ringGeometry
          args={[1.28, 1.4, 64]}
        />

        <meshStandardMaterial
          color="#f8fafc"
        />
      </mesh>

      <Linha
        position={[
          0,
          helipontoY + 0.12,
          0,
        ]}
        size={[1.62, 0.03, 0.14]}
        color="#f8fafc"
      />

      <Linha
        position={[
          0,
          helipontoY + 0.12,
          0,
        ]}
        size={[0.14, 0.03, 1.62]}
        color="#f8fafc"
      />
    </group>
  );
}

function Subsolos({
  andares,
  locais,
  camada,
  selecionado,
  onSelect,
}) {
  if (
    camada !== "geral" &&
    camada !== "subsolos"
  ) {
    return null;
  }

  const lista =
    ordenarAndares(
      andares.filter(
        (andar) =>
          Number(andar.ordem) < 0
      )
    ).reverse();

  const espacamento = 1.24;
  const alturaLivre = 0.98;
  const largura = 12.75;
  const profundidade = 10.82;

  return (
    <group>
      {lista.map((andar, index) => {
        const y =
          -(index + 1.78) *
          espacamento;

        const ativo =
          selecionado?.id ===
          andar.id;

        const quantidade =
          locaisDoAndar(
            locais,
            andar.id
          ).length;

        return (
          <group key={andar.id}>
            <Box
              position={[0, y, 0]}
              size={[
                largura,
                0.16,
                profundidade,
              ]}
              color={
                ativo
                  ? "#22d3ee"
                  : "#334155"
              }
              roughness={0.72}
              onClick={(event) => {
                event.stopPropagation();

                onSelect(andar);
              }}
            />

            {[
              -4.65,
              -1.55,
              1.55,
              4.65,
            ].map((x) => (
              <group
                key={`${andar.id}-${x}`}
              >
                <Box
                  position={[
                    x,
                    y + alturaLivre / 2,
                    -2.55,
                  ]}
                  size={[
                    0.2,
                    alturaLivre,
                    0.2,
                  ]}
                  color="#cbd5e1"
                />

                <Box
                  position={[
                    x,
                    y + alturaLivre / 2,
                    2.55,
                  ]}
                  size={[
                    0.2,
                    alturaLivre,
                    0.2,
                  ]}
                  color="#cbd5e1"
                />
              </group>
            ))}

            {[
              -4.1,
              -2.35,
              -0.6,
              1.15,
              2.9,
              4.3,
            ].map((x, carIndex) => (
              <Carro
                key={`${andar.id}-carro-${x}`}
                position={[
                  x,
                  y + 0.13,
                  1.55,
                ]}
                color={
                  carIndex % 2
                    ? "#cbd5e1"
                    : "#1e293b"
                }
              />
            ))}

            <Label
              position={[
                -7.32,
                y + 0.18,
                0,
              ]}
              titulo={
                andar.tituloCurto ||
                andar.nome.replace(
                  "º Subsolo",
                  "SS"
                )
              }
              subtitulo={`${quantidade} local(is)`}
              ativo={ativo}
              onClick={() =>
                onSelect(andar)
              }
            />
          </group>
        );
      })}

      <Linha
        position={[0, 0.04, 0]}
        size={[13.45, 0.1, 11.42]}
        color="#64748b"
      />

      <Label
        position={[-7.36, 0.2, 2.2]}
        titulo="Nível da rua"
        subtitulo="0,00 m"
      />
    </group>
  );
}

function ModeloJK1455({
  andares,
  locais,
  itensExternos,
  camada,
  andarSelecionado,
  itemSelecionado,
  onSelectAndar,
  onSelectItem,
  posicionamento,
  onEscolherPosicao,
}) {
  const terreo =
    andares.find(
      (andar) =>
        Number(andar.ordem) === 0
    );

  const estacionamento =
    itensExternos.find(
      itemEhEstacionamento
    );

  const mostrarExternos =
    camada === "geral" ||
    camada === "externas" ||
    camada === "sistemas";

  return (
    <group>
      <GradeRua />

      {mostrarExternos && (
        <>
          <EstacionamentoFundos
            item={estacionamento}
            selecionado={
              itemSelecionado?.id ===
              estacionamento?.id
            }
            onSelect={onSelectItem}
          />

          <Paisagismo />

          {ordenarItens(
            itensExternos
          ).map((item) => (
            <ItemExternoVisual
              key={item.id}
              item={item}
              selecionado={
                itemSelecionado?.id ===
                item.id
              }
              onSelect={onSelectItem}
            />
          ))}
        </>
      )}

      <Embasamento
        terreo={terreo}
        selecionado={
          andarSelecionado?.id ===
          terreo?.id
        }
        onSelect={onSelectAndar}
        camada={camada}
      />

      <TorrePrincipal
        andares={andares}
        selecionado={andarSelecionado}
        onSelect={onSelectAndar}
        camada={camada}
      />

      <AreasTecnicasSuperiores
        andares={andares}
        selecionado={andarSelecionado}
        onSelect={onSelectAndar}
        camada={camada}
      />

      <Subsolos
        andares={andares}
        locais={locais}
        camada={camada}
        selecionado={andarSelecionado}
        onSelect={onSelectAndar}
      />

      <PlanoPosicionamento
        ativo={posicionamento.ativo}
        lado={posicionamento.lado}
        onEscolher={onEscolherPosicao}
      />
    </group>
  );
}

// =========================================================
// PAINÉIS LATERAIS
// =========================================================

function PainelAndar({
  andar,
  locais,
  arquivos,
  aberto,
  onAlternar,
}) {
  if (!andar) return null;

  const fotos =
    arquivos.filter(
      (arquivo) =>
        arquivo.tipoArquivo === "foto"
    );

  const plantas =
    arquivos.filter(
      (arquivo) =>
        arquivo.tipoArquivo !== "foto"
    );

  const primeiraPlanta =
    plantas[0];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onAlternar}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-xs font-black uppercase text-blue-600">
            Pavimento selecionado
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            {andar.nome}
          </h2>
        </div>

        {aberto ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>

      {aberto && (
        <>
          <p className="mt-2 text-sm text-slate-500">
            {andar.observacao ||
              "Sem observações cadastradas."}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Resumo
              rotulo="Locais"
              valor={locais.length}
            />

            <Resumo
              rotulo="Fotos"
              valor={fotos.length}
            />

            <Resumo
              rotulo="Plantas"
              valor={plantas.length}
            />
          </div>

          <button
            type="button"
            disabled={!primeiraPlanta}
            onClick={() =>
              primeiraPlanta &&
              window.open(
                primeiraPlanta.urlPublica,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
          >
            <FileText size={17} />
            Abrir planta
          </button>

          <div className="mt-5">
            <p className="text-sm font-black text-slate-800">
              Locais, locatários e equipamentos
            </p>

            {locais.length ? (
              <div className="mt-2 max-h-[260px] space-y-2 overflow-auto">
                {locais.map((local) => (
                  <div
                    key={local.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-black text-slate-800">
                      {local.nome}
                    </p>

                    <p className="mt-1 text-xs font-bold text-blue-700">
                      {local.tipo}
                    </p>

                    {local.descricao && (
                      <p className="mt-1 text-xs text-slate-500">
                        {local.descricao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Nenhum local cadastrado.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Resumo({
  rotulo,
  valor,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold text-slate-400">
        {rotulo}
      </p>

      <p className="mt-1 text-lg font-black text-slate-900">
        {valor}
      </p>
    </div>
  );
}

function ArquivosEntidade({
  entidade,
  arquivos,
  salvando,
  aberto,
  onAlternar,
  onUpload,
  onExcluir,
}) {
  const cameraInput =
    useRef(null);

  const fotoInput =
    useRef(null);

  const plantaInput =
    useRef(null);

  if (!entidade) return null;

  const fotos =
    arquivos.filter(
      (arquivo) =>
        arquivo.tipoArquivo === "foto"
    );

  const plantas =
    arquivos.filter(
      (arquivo) =>
        arquivo.tipoArquivo !== "foto"
    );

  function enviar(
    event,
    tipo
  ) {
    const arquivo =
      event.target.files?.[0];

    if (arquivo) {
      onUpload(arquivo, tipo);
    }

    event.target.value = "";
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onAlternar}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-xs font-black uppercase text-slate-400">
            Arquivos associados
          </p>

          <h3 className="mt-1 font-black text-slate-900">
            {entidade.dados.nome}
          </h3>
        </div>

        {aberto ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>

      {aberto && (
        <>
          <div className="mt-4 grid gap-2">
            <BotaoArquivo
              icon={<Camera size={17} />}
              texto="Abrir câmera"
              onClick={() =>
                cameraInput.current?.click()
              }
            />

            <BotaoArquivo
              icon={<ImagePlus size={17} />}
              texto="Adicionar foto"
              onClick={() =>
                fotoInput.current?.click()
              }
            />

            <BotaoArquivo
              icon={<FileText size={17} />}
              texto="Adicionar planta ou PDF"
              onClick={() =>
                plantaInput.current?.click()
              }
            />

            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) =>
                enviar(event, "foto")
              }
            />

            <input
              ref={fotoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                enviar(event, "foto")
              }
            />

            <input
              ref={plantaInput}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(event) =>
                enviar(event, "planta")
              }
            />
          </div>

          {salvando && (
            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-700">
              <Loader2
                size={15}
                className="animate-spin"
              />

              Processando arquivo...
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm font-black text-slate-800">
              Fotos
            </p>

            {fotos.length ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {fotos.map((arquivo) => (
                  <div
                    key={arquivo.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          arquivo.urlPublica,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="block w-full"
                    >
                      <img
                        src={arquivo.urlPublica}
                        alt={arquivo.nome}
                        className="h-24 w-full object-cover"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onExcluir(arquivo)
                      }
                      className="absolute right-1 top-1 rounded-lg bg-rose-600 p-1.5 text-white shadow"
                      title="Excluir foto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Nenhuma foto adicionada.
              </p>
            )}
          </div>

          <div className="mt-5">
            <p className="text-sm font-black text-slate-800">
              Plantas e PDFs
            </p>

            {plantas.length ? (
              <div className="mt-2 space-y-2">
                {plantas.map((arquivo) => (
                  <div
                    key={arquivo.id}
                    className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          arquivo.urlPublica,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <FileText
                        size={18}
                        className="shrink-0 text-rose-500"
                      />

                      <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-700">
                        {arquivo.nome}
                      </span>

                      <span className="text-xs font-black text-blue-600">
                        Abrir
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onExcluir(arquivo)
                      }
                      className="rounded-lg bg-rose-50 p-1.5 text-rose-700"
                      title="Excluir planta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Nenhuma planta adicionada.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BotaoArquivo({
  icon,
  texto,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {texto}
    </button>
  );
}

// =========================================================
// CADASTRO DE ITEM EXTERNO
// =========================================================

function CadastroItemExterno({
  itemSelecionado,
  salvando,
  posicionamento,
  onAtivarPosicionamento,
  onSalvar,
  onExcluir,
  onNovo,
}) {
  const [form, setForm] =
    useState(itemExternoVazio());

  useEffect(() => {
    setForm(
      itemSelecionado
        ? {
            ...itemSelecionado,
          }
        : itemExternoVazio()
    );
  }, [itemSelecionado?.id]);

  useEffect(() => {
    if (posicionamento.coordenadas) {
      setForm((atual) => ({
        ...atual,
        ...posicionamento.coordenadas,
      }));
    }
  }, [posicionamento.coordenadas]);

  function alterar(
    campo,
    valor
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900">
            Item externo personalizado
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Cadastre caixas, tampas, cubículos e equipamentos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(itemExternoVazio());
            onNovo();
          }}
          className="rounded-xl p-2 text-blue-600 hover:bg-blue-50"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={form.nome}
          onChange={(event) =>
            alterar(
              "nome",
              event.target.value
            )
          }
          placeholder="Nome do item"
          className="rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
        />

        <select
          value={form.categoria}
          onChange={(event) =>
            alterar(
              "categoria",
              event.target.value
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {CATEGORIAS_ITEM.map(
            (categoria) => (
              <option key={categoria}>
                {categoria}
              </option>
            )
          )}
        </select>

        <select
          value={form.lado}
          onChange={(event) =>
            alterar(
              "lado",
              event.target.value
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {LADOS_EXTERNOS.map(
            (opcao) => (
              <option
                key={opcao.value}
                value={opcao.value}
              >
                {opcao.label}
              </option>
            )
          )}
        </select>

        <select
          value={form.tipoVisual}
          onChange={(event) =>
            alterar(
              "tipoVisual",
              event.target.value
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {TIPOS_VISUAIS.map(
            (opcao) => (
              <option
                key={opcao.value}
                value={opcao.value}
              >
                {opcao.label}
              </option>
            )
          )}
        </select>

        <select
          value={form.modoImplantacao}
          onChange={(event) =>
            alterar(
              "modoImplantacao",
              event.target.value
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {MODOS_IMPLANTACAO.map(
            (opcao) => (
              <option
                key={opcao.value}
                value={opcao.value}
              >
                {opcao.label}
              </option>
            )
          )}
        </select>

        <input
          value={form.cor}
          onChange={(event) =>
            alterar(
              "cor",
              event.target.value
            )
          }
          type="color"
          className="h-[46px] rounded-2xl border border-slate-200 p-2"
        />

        <button
          type="button"
          onClick={() =>
            onAtivarPosicionamento(
              form.lado
            )
          }
          className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 md:col-span-2"
        >
          <MousePointer2 size={17} />

          {posicionamento.ativo
            ? "Clique no terreno do mapa"
            : "Escolher local no mapa"}
        </button>

        <CamposNumericos
          form={form}
          alterar={alterar}
          campos={[
            ["x", "X"],
            ["y", "Y"],
            ["z", "Z"],
          ]}
        />

        <CamposNumericos
          form={form}
          alterar={alterar}
          campos={[
            ["largura", "Largura"],
            ["altura", "Altura"],
            [
              "profundidade",
              "Profund.",
            ],
          ]}
        />

        <textarea
          value={form.descricao}
          onChange={(event) =>
            alterar(
              "descricao",
              event.target.value
            )
          }
          placeholder="Descrição"
          className="min-h-[70px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onSalvar(form)
          }
          disabled={
            salvando ||
            !form.nome
          }
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-black text-white disabled:opacity-50"
        >
          {salvando ? (
            <Loader2
              size={17}
              className="animate-spin"
            />
          ) : (
            <Save size={17} />
          )}

          {form.id
            ? "Atualizar item"
            : "Adicionar item"}
        </button>

        {form.id && (
          <button
            type="button"
            onClick={() =>
              onExcluir(form)
            }
            className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 font-black text-rose-700"
          >
            <Trash2 size={17} />
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function CamposNumericos({
  form,
  alterar,
  campos,
}) {
  return (
    <div className="grid grid-cols-3 gap-2 md:col-span-2">
      {campos.map(
        ([campo, rotulo]) => (
          <label
            key={campo}
            className="text-xs font-bold text-slate-500"
          >
            {rotulo}

            <input
              value={form[campo]}
              onChange={(event) =>
                alterar(
                  campo,
                  Number(
                    event.target.value
                  )
                )
              }
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm"
            />
          </label>
        )
      )}
    </div>
  );
}

// =========================================================
// MODAL DE GERENCIAMENTO
// =========================================================

function ModalGerenciar({
  andares,
  locais,
  salvando,
  onFechar,
  onSalvarAndar,
  onExcluirAndar,
  onSalvarLocal,
  onExcluirLocal,
}) {
  const [andarForm, setAndarForm] =
    useState(andarVazio());

  const [
    andarGerenciadoId,
    setAndarGerenciadoId,
  ] =
    useState(
      andares.find(
        (andar) =>
          Number(andar.ordem) === 0
      )?.id ||
        andares[0]?.id ||
        ""
    );

  const [localForm, setLocalForm] =
    useState(
      localVazio(
        andarGerenciadoId
      )
    );

  const andarGerenciado =
    andares.find(
      (andar) =>
        andar.id === andarGerenciadoId
    );

  const locaisGerenciados =
    locais
      .filter(
        (local) =>
          local.andarId ===
          andarGerenciadoId
      )
      .sort((a, b) =>
        a.nome.localeCompare(b.nome)
      );

  useEffect(() => {
    setLocalForm(
      localVazio(
        andarGerenciadoId
      )
    );
  }, [andarGerenciadoId]);

  function editarAndar(andar) {
    setAndarForm({
      ...andar,
    });

    setAndarGerenciadoId(
      andar.id
    );
  }

  function editarLocal(local) {
    setLocalForm({
      ...local,
    });
  }

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/50 p-3 md:p-6">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Gerenciar andares, locatários e equipamentos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Edite nomes, observações e itens cadastrados em cada pavimento.
            </p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[310px_1fr]">
          <aside className="rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-slate-900">
                Pavimentos
              </h3>

              <button
                type="button"
                onClick={() =>
                  setAndarForm(
                    andarVazio()
                  )
                }
                className="rounded-xl bg-blue-600 p-2 text-white"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="mt-3 max-h-[620px] space-y-1 overflow-auto">
              {andares
                .slice()
                .reverse()
                .map((andar) => (
                  <button
                    type="button"
                    key={andar.id}
                    onClick={() =>
                      editarAndar(andar)
                    }
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold ${
                      andarGerenciadoId ===
                      andar.id
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          andar.cor,
                      }}
                    />

                    <span className="flex-1 truncate">
                      {andar.nome}
                    </span>

                    <Edit3 size={13} />
                  </button>
                ))}
            </div>
          </aside>

          <main className="space-y-5">
            <section className="rounded-3xl border border-slate-100 p-4">
              <h3 className="font-black text-slate-900">
                {andarForm.id
                  ? "Editar pavimento"
                  : "Adicionar pavimento"}
              </h3>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  value={andarForm.nome}
                  onChange={(event) =>
                    setAndarForm(
                      (atual) => ({
                        ...atual,
                        nome:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Nome do pavimento"
                  className="rounded-2xl border border-slate-200 p-3 text-sm"
                />

                <input
                  value={andarForm.ordem}
                  onChange={(event) =>
                    setAndarForm(
                      (atual) => ({
                        ...atual,
                        ordem: Number(
                          event.target.value
                        ),
                      })
                    )
                  }
                  type="number"
                  placeholder="Ordem"
                  className="rounded-2xl border border-slate-200 p-3 text-sm"
                />

                <input
                  value={andarForm.cor}
                  onChange={(event) =>
                    setAndarForm(
                      (atual) => ({
                        ...atual,
                        cor:
                          event.target.value,
                      })
                    )
                  }
                  type="color"
                  className="h-[46px] rounded-2xl border border-slate-200 p-2"
                />

                <input
                  value={andarForm.tituloCurto}
                  onChange={(event) =>
                    setAndarForm(
                      (atual) => ({
                        ...atual,
                        tituloCurto:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Título curto opcional"
                  className="rounded-2xl border border-slate-200 p-3 text-sm"
                />

                <textarea
                  value={andarForm.observacao}
                  onChange={(event) =>
                    setAndarForm(
                      (atual) => ({
                        ...atual,
                        observacao:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Observações"
                  className="min-h-[74px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    salvando ||
                    !andarForm.nome
                  }
                  onClick={() =>
                    onSalvarAndar(
                      andarForm
                    )
                  }
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  <Save size={16} />
                  Salvar pavimento
                </button>

                {andarForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      onExcluirAndar(
                        andarForm
                      )
                    }
                    className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"
                  >
                    <Trash2 size={16} />
                    Remover pavimento
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">
                    Locatários, locais e equipamentos
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Pavimento:{" "}
                    <strong>
                      {andarGerenciado?.nome ||
                        "Selecione um pavimento"}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    !andarGerenciadoId
                  }
                  onClick={() =>
                    setLocalForm(
                      localVazio(
                        andarGerenciadoId
                      )
                    )
                  }
                  className="rounded-xl bg-blue-600 p-2 text-white disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <div className="max-h-[420px] space-y-2 overflow-auto">
                  {locaisGerenciados.length ? (
                    locaisGerenciados.map(
                      (local) => (
                        <button
                          type="button"
                          key={local.id}
                          onClick={() =>
                            editarLocal(local)
                          }
                          className={`w-full rounded-2xl border p-3 text-left ${
                            localForm.id ===
                            local.id
                              ? "border-blue-400 bg-blue-50"
                              : "border-slate-100 bg-slate-50"
                          }`}
                        >
                          <p className="text-sm font-black text-slate-800">
                            {local.nome}
                          </p>

                          <p className="mt-1 text-xs font-bold text-blue-700">
                            {local.tipo}
                          </p>
                        </button>
                      )
                    )
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                      Nenhum item cadastrado neste pavimento.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <input
                    value={localForm.nome}
                    onChange={(event) =>
                      setLocalForm(
                        (atual) => ({
                          ...atual,
                          nome:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Nome do locatário, local ou equipamento"
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                  />

                  <select
                    value={localForm.tipo}
                    onChange={(event) =>
                      setLocalForm(
                        (atual) => ({
                          ...atual,
                          tipo:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm"
                  >
                    {TIPOS_LOCAL.map(
                      (tipo) => (
                        <option key={tipo}>
                          {tipo}
                        </option>
                      )
                    )}
                  </select>

                  <input
                    value={
                      localForm.responsavel
                    }
                    onChange={(event) =>
                      setLocalForm(
                        (atual) => ({
                          ...atual,
                          responsavel:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Responsável"
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                  />

                  <textarea
                    value={
                      localForm.descricao
                    }
                    onChange={(event) =>
                      setLocalForm(
                        (atual) => ({
                          ...atual,
                          descricao:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Descrição"
                    className="min-h-[74px] w-full rounded-2xl border border-slate-200 p-3 text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        salvando ||
                        !andarGerenciadoId ||
                        !localForm.nome
                      }
                      onClick={() =>
                        onSalvarLocal({
                          ...localForm,
                          andarId:
                            andarGerenciadoId,
                        })
                      }
                      className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      <Save size={16} />
                      Salvar item
                    </button>

                    {localForm.id && (
                      <button
                        type="button"
                        onClick={() =>
                          onExcluirLocal(
                            localForm
                          )
                        }
                        className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"
                      >
                        <Trash2 size={16} />
                        Remover item
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// PÁGINA PRINCIPAL
// =========================================================

export default function Mapa3D() {
  const [andares, setAndares] =
    useState([]);

  const [locais, setLocais] =
    useState([]);

  const [
    itensExternos,
    setItensExternos,
  ] =
    useState([]);

  const [arquivos, setArquivos] =
    useState([]);

  const [
    andarSelecionado,
    setAndarSelecionado,
  ] =
    useState(null);

  const [
    itemSelecionado,
    setItemSelecionado,
  ] =
    useState(null);

  const [
    entidadeSelecionada,
    setEntidadeSelecionada,
  ] =
    useState(null);

  const [
    painelAberto,
    setPainelAberto,
  ] =
    useState(
      () =>
        typeof window !==
          "undefined" &&
        window.innerWidth >= 1280
    );

  const [
    painelLocaisAberto,
    setPainelLocaisAberto,
  ] =
    useState(true);

  const [
    painelArquivosAberto,
    setPainelArquivosAberto,
  ] =
    useState(true);

  const [
    menuCamadasAberto,
    setMenuCamadasAberto,
  ] =
    useState(true);

  const [
    menuMobileAberto,
    setMenuMobileAberto,
  ] =
    useState(false);

  const [
    cadastroExternoAberto,
    setCadastroExternoAberto,
  ] =
    useState(false);

  const [
    modalGerenciarAberto,
    setModalGerenciarAberto,
  ] =
    useState(false);

  const [camada, setCamada] =
    useState("geral");

  const [
    posicionamento,
    setPosicionamento,
  ] =
    useState({
      ativo: false,
      lado: "frente",
      coordenadas: null,
    });

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [
    resetCamera,
    setResetCamera,
  ] =
    useState(0);

  const andaresOrdenados =
    useMemo(
      () =>
        ordenarAndares(
          andares
        ),
      [andares]
    );

  const itensOrdenados =
    useMemo(
      () =>
        ordenarItens(
          itensExternos
        ),
      [itensExternos]
    );

  const locaisSelecionados =
    useMemo(() => {
      if (!andarSelecionado) {
        return [];
      }

      return locaisDoAndar(
        locais,
        andarSelecionado.id
      );
    }, [andarSelecionado, locais]);

  async function carregarArquivos(
    entidade
  ) {
    if (!entidade?.dados?.id) {
      setArquivos([]);
      return;
    }

    const lista =
      await listarArquivosMapa3DPorEntidade(
        entidade.tipo,
        entidade.dados.id
      );

    setArquivos(lista);
  }

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const [
        listaAndares,
        listaLocais,
        listaItens,
      ] =
        await Promise.all([
          listarAndaresMapa3D(),
          listarLocaisMapa3D(),
          listarItensExternosMapa3D(),
        ]);

      const listaSem13 =
        listaAndares.filter(
          (andar) =>
            Number(andar.ordem) !== 13
        );

      setAndares(listaSem13);
      setLocais(listaLocais);
      setItensExternos(listaItens);

      const terreo =
        listaSem13.find(
          (andar) =>
            Number(andar.ordem) === 0
        );

      if (terreo) {
        const entidade = {
          tipo: "andar",
          dados: terreo,
        };

        setAndarSelecionado(
          terreo
        );

        setEntidadeSelecionada(
          entidade
        );

        await carregarArquivos(
          entidade
        );
      }
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível carregar o Mapa 3D."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function selecionarAndar(
    andar
  ) {
    const entidade = {
      tipo: "andar",
      dados: andar,
    };

    setAndarSelecionado(andar);
    setItemSelecionado(null);

    setEntidadeSelecionada(
      entidade
    );

    setCadastroExternoAberto(
      false
    );

    await carregarArquivos(
      entidade
    );
  }

  async function selecionarItem(
    item
  ) {
    const entidade = {
      tipo: "item_externo",
      dados: item,
    };

    setItemSelecionado(item);
    setAndarSelecionado(null);

    setEntidadeSelecionada(
      entidade
    );

    setCadastroExternoAberto(
      true
    );

    setPainelAberto(true);

    await carregarArquivos(
      entidade
    );
  }

  async function salvarAndar(form) {
    if (
      Number(form.ordem) === 13
    ) {
      window.alert(
        "O edifício não utiliza a identificação de 13º andar."
      );

      return;
    }

    setSalvando(true);

    try {
      if (form.id) {
        const atualizado =
          await atualizarAndarMapa3D(
            form.id,
            form
          );

        setAndares((atuais) =>
          ordenarAndares(
            atuais.map((andar) =>
              andar.id === atualizado.id
                ? atualizado
                : andar
            )
          )
        );
      } else {
        const criado =
          await criarAndarMapa3D(
            form
          );

        setAndares((atuais) =>
          ordenarAndares([
            ...atuais,
            criado,
          ])
        );
      }
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível salvar o pavimento."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerAndar(andar) {
    if (
      !window.confirm(
        `Remover o pavimento "${andar.nome}"?`
      )
    ) {
      return;
    }

    try {
      await excluirAndarMapa3D(
        andar.id
      );

      setAndares((atuais) =>
        atuais.filter(
          (item) =>
            item.id !== andar.id
        )
      );
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível remover o pavimento."
      );
    }
  }

  async function salvarLocal(form) {
    setSalvando(true);

    try {
      if (form.id) {
        const atualizado =
          await atualizarLocalMapa3D(
            form.id,
            form
          );

        setLocais((atuais) =>
          atuais.map((local) =>
            local.id === atualizado.id
              ? atualizado
              : local
          )
        );
      } else {
        const criado =
          await criarLocalMapa3D(
            form
          );

        setLocais((atuais) => [
          ...atuais,
          criado,
        ]);
      }
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível salvar o local."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerLocal(local) {
    if (
      !window.confirm(
        `Remover "${local.nome}"?`
      )
    ) {
      return;
    }

    try {
      await excluirLocalMapa3D(
        local.id
      );

      setLocais((atuais) =>
        atuais.filter(
          (item) =>
            item.id !== local.id
        )
      );
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível remover o local."
      );
    }
  }

  async function salvarItemExterno(
    form
  ) {
    setSalvando(true);

    try {
      if (form.id) {
        const atualizado =
          await atualizarItemExternoMapa3D(
            form.id,
            form
          );

        setItensExternos((atuais) =>
          atuais.map((item) =>
            item.id === atualizado.id
              ? atualizado
              : item
          )
        );

        await selecionarItem(
          atualizado
        );
      } else {
        const criado =
          await criarItemExternoMapa3D(
            form
          );

        setItensExternos((atuais) =>
          ordenarItens([
            ...atuais,
            criado,
          ])
        );

        await selecionarItem(
          criado
        );
      }
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível salvar o item externo."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerItemExterno(
    item
  ) {
    if (
      !window.confirm(
        `Remover "${item.nome}"?`
      )
    ) {
      return;
    }

    try {
      await excluirItemExternoMapa3D(
        item.id
      );

      setItensExternos((atuais) =>
        atuais.filter(
          (atual) =>
            atual.id !== item.id
        )
      );

      setItemSelecionado(null);
      setEntidadeSelecionada(null);
      setArquivos([]);
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível remover o item externo."
      );
    }
  }

  async function enviarArquivo(
    arquivo,
    tipoArquivo
  ) {
    if (
      !arquivo ||
      !entidadeSelecionada
    ) {
      return;
    }

    setSalvando(true);

    try {
      const criado =
        await criarArquivoMapa3D({
          entidadeTipo:
            entidadeSelecionada.tipo,
          entidadeId:
            entidadeSelecionada
              .dados.id,
          tipoArquivo,
          arquivo,
        });

      setArquivos((atuais) => [
        criado,
        ...atuais,
      ]);
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível enviar o arquivo."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function removerArquivo(
    arquivo
  ) {
    const senha =
      window.prompt(
        "Digite a senha para excluir este arquivo:"
      );

    if (!senha) return;

    if (
      !window.confirm(
        `Excluir "${arquivo.nome}" definitivamente?`
      )
    ) {
      return;
    }

    setSalvando(true);

    try {
      await excluirArquivoProtegidoMapa3D(
        arquivo.id,
        arquivo.caminhoStorage,
        senha
      );

      setArquivos((atuais) =>
        atuais.filter(
          (item) =>
            item.id !== arquivo.id
        )
      );
    } catch (error) {
      console.error(error);

      if (
        error.message ===
        "Senha incorreta."
      ) {
        window.alert(
          "Senha incorreta. O arquivo não foi excluído."
        );
      } else {
        setErro(
          "Não foi possível excluir o arquivo."
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
        <Loader2
          className="mx-auto animate-spin text-blue-600"
          size={32}
        />

        <p className="mt-3 font-bold text-slate-700">
          Carregando Mapa 3D...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {erro && (
        <div className="flex gap-2 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle size={18} />

          <span>{erro}</span>
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-5 ${
          painelAberto
            ? "xl:grid-cols-[minmax(0,1fr)_360px]"
            : ""
        }`}
      >
        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900">
                Mapa 3D — Edifício JK 1455
              </h1>

              <p className="text-sm text-slate-500">
                Torre espelhada, pavimentos técnicos, áreas externas e subsolos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <BotaoTopo
                icon={<RotateCcw size={16} />}
                texto="Reposicionar"
                onClick={() =>
                  setResetCamera(
                    (valor) => valor + 1
                  )
                }
              />

              <BotaoTopo
                icon={<RefreshCcw size={16} />}
                texto="Atualizar"
                onClick={carregar}
              />

              <BotaoTopo
                icon={<Settings2 size={16} />}
                texto="Gerenciar"
                onClick={() =>
                  setModalGerenciarAberto(
                    true
                  )
                }
              />

              <BotaoTopo
                icon={<Plus size={16} />}
                texto="Item externo"
                onClick={() => {
                  setCadastroExternoAberto(
                    true
                  );

                  setPainelAberto(true);
                  setItemSelecionado(null);
                  setAndarSelecionado(null);
                  setEntidadeSelecionada(
                    null
                  );
                  setArquivos([]);
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setPainelAberto(
                    (valor) => !valor
                  )
                }
                className="flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white"
              >
                {painelAberto ? (
                  <Minimize2 size={16} />
                ) : (
                  <Maximize2 size={16} />
                )}

                Painel
              </button>
            </div>
          </div>

          <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 xl:min-h-[900px] xl:grid-cols-[200px_175px_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-100 bg-slate-50/80 p-4 xl:block">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <Building2
                  size={22}
                  className="text-blue-600"
                />

                <p className="mt-2 font-black text-slate-900">
                  Edifício JK 1455
                </p>

                <p className="text-[11px] text-slate-400">
                  Gestão predial
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMenuCamadasAberto(
                    (valor) => !valor
                  )
                }
                className="mt-4 flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-black text-slate-700 hover:bg-white"
              >
                Navegação

                {menuCamadasAberto ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>

              {menuCamadasAberto && (
                <div className="mt-1 space-y-1">
                  {CAMADAS.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() =>
                        setCamada(item.id)
                      }
                      className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-bold ${
                        camada === item.id
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      <Eye size={15} />
                      {item.nome}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-5 px-2 text-xs font-black uppercase text-slate-400">
                Itens externos
              </p>

              <div className="mt-2 max-h-[360px] space-y-1 overflow-auto">
                {itensOrdenados.map(
                  (item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() =>
                        selecionarItem(item)
                      }
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-bold ${
                        itemSelecionado?.id ===
                        item.id
                          ? "bg-cyan-100 text-cyan-950"
                          : "hover:bg-white"
                      }`}
                    >
                      <MapPin size={13} />

                      <span className="truncate">
                        {item.nome}
                      </span>
                    </button>
                  )
                )}
              </div>
            </aside>

            <aside className="hidden border-r border-slate-100 bg-white p-3 xl:block">
              <p className="px-2 text-xs font-black uppercase text-slate-400">
                Pavimentos
              </p>

              <div className="mt-2 max-h-[870px] space-y-1 overflow-auto">
                {andaresOrdenados
                  .slice()
                  .reverse()
                  .map((andar) => (
                    <button
                      type="button"
                      key={andar.id}
                      onClick={() =>
                        selecionarAndar(
                          andar
                        )
                      }
                      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-bold ${
                        andarSelecionado?.id ===
                        andar.id
                          ? "bg-cyan-100 text-cyan-950"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            andar.cor,
                        }}
                      />

                      <span className="flex-1 truncate">
                        {andar.nome}
                      </span>
                    </button>
                  ))}
              </div>
            </aside>

            <div className="min-h-[calc(100vh-190px)] bg-gradient-to-b from-slate-50 via-blue-50 to-slate-100 xl:min-h-[900px]">
              <Canvas
                shadows
                dpr={[1, 1.55]}
                key={resetCamera}
              >
                <PerspectiveCamera
                  makeDefault
                  position={[23, 18, 25]}
                  fov={46}
                />

                <ambientLight
                  intensity={0.82}
                />

                <directionalLight
                  position={[10, 15, 9]}
                  intensity={1.42}
                  castShadow
                />

                <ModeloJK1455
                  andares={andaresOrdenados}
                  locais={locais}
                  itensExternos={
                    itensOrdenados
                  }
                  camada={camada}
                  andarSelecionado={
                    andarSelecionado
                  }
                  itemSelecionado={
                    itemSelecionado
                  }
                  onSelectAndar={
                    selecionarAndar
                  }
                  onSelectItem={
                    selecionarItem
                  }
                  posicionamento={
                    posicionamento
                  }
                  onEscolherPosicao={(
                    coordenadas
                  ) =>
                    setPosicionamento(
                      (atual) => ({
                        ...atual,
                        ativo: false,
                        coordenadas,
                      })
                    )
                  }
                />

                <ContactShadows
                  opacity={0.25}
                  scale={28}
                  blur={3}
                  far={10}
                  position={[0, -8.2, 0]}
                />

                <Environment preset="city" />

                <OrbitControls
                  makeDefault
                  enablePan
                  enableZoom
                  enableRotate={
                    !posicionamento.ativo
                  }
                  minDistance={8}
                  maxDistance={78}
                  target={[0, 5.1, 0]}
                  maxPolarAngle={
                    Math.PI / 2.02
                  }
                />
              </Canvas>
            </div>
          </div>
        </section>

        {painelAberto && (
          <section className="fixed inset-x-3 bottom-3 top-20 z-[80] overflow-y-auto rounded-3xl bg-slate-100/95 p-3 shadow-2xl backdrop-blur xl:static xl:inset-auto xl:z-auto xl:overflow-visible xl:rounded-none xl:bg-transparent xl:p-0 xl:shadow-none">
            <button
              type="button"
              onClick={() =>
                setPainelAberto(false)
              }
              className="mb-3 ml-auto flex rounded-xl bg-white p-2 text-slate-700 shadow xl:hidden"
            >
              <X size={18} />
            </button>

            <div className="space-y-5">
              <PainelAndar
                andar={andarSelecionado}
                locais={locaisSelecionados}
                arquivos={arquivos}
                aberto={painelLocaisAberto}
                onAlternar={() =>
                  setPainelLocaisAberto(
                    (valor) => !valor
                  )
                }
              />

              <ArquivosEntidade
                entidade={
                  entidadeSelecionada
                }
                arquivos={arquivos}
                salvando={salvando}
                aberto={
                  painelArquivosAberto
                }
                onAlternar={() =>
                  setPainelArquivosAberto(
                    (valor) => !valor
                  )
                }
                onUpload={enviarArquivo}
                onExcluir={removerArquivo}
              />

              {cadastroExternoAberto && (
                <CadastroItemExterno
                  itemSelecionado={
                    itemSelecionado
                  }
                  salvando={salvando}
                  posicionamento={
                    posicionamento
                  }
                  onAtivarPosicionamento={(
                    lado
                  ) =>
                    setPosicionamento({
                      ativo: true,
                      lado,
                      coordenadas: null,
                    })
                  }
                  onSalvar={
                    salvarItemExterno
                  }
                  onExcluir={
                    removerItemExterno
                  }
                  onNovo={() => {
                    setItemSelecionado(
                      null
                    );

                    setEntidadeSelecionada(
                      null
                    );

                    setArquivos([]);
                  }}
                />
              )}
            </div>
          </section>
        )}
      </div>

      <div className="fixed bottom-5 left-5 z-[70] flex gap-2 xl:hidden">
        <button
          type="button"
          onClick={() =>
            setMenuMobileAberto(true)
          }
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl"
        >
          Pavimentos
        </button>

        <button
          type="button"
          onClick={() =>
            setPainelAberto(
              (valor) => !valor
            )
          }
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-xl"
        >
          {painelAberto
            ? "Fechar painel"
            : "Informações"}
        </button>
      </div>

      {menuMobileAberto && (
        <div className="fixed inset-0 z-[90] bg-slate-950/45 p-3 xl:hidden">
          <div className="ml-auto h-full w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-slate-900">
                Pavimentos
              </h2>

              <button
                type="button"
                onClick={() =>
                  setMenuMobileAberto(
                    false
                  )
                }
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 space-y-1">
              {andaresOrdenados
                .slice()
                .reverse()
                .map((andar) => (
                  <button
                    type="button"
                    key={andar.id}
                    onClick={async () => {
                      await selecionarAndar(
                        andar
                      );

                      setMenuMobileAberto(
                        false
                      );
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-bold ${
                      andarSelecionado?.id ===
                      andar.id
                        ? "bg-cyan-100 text-cyan-950"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          andar.cor,
                      }}
                    />

                    <span className="flex-1 truncate">
                      {andar.nome}
                    </span>
                  </button>
                ))}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-black uppercase text-slate-400">
                Itens externos
              </p>

              <div className="mt-2 space-y-1">
                {itensOrdenados.map(
                  (item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={async () => {
                        await selecionarItem(
                          item
                        );

                        setMenuMobileAberto(
                          false
                        );
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-slate-50"
                    >
                      <MapPin size={14} />

                      <span className="truncate">
                        {item.nome}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalGerenciarAberto && (
        <ModalGerenciar
          andares={andaresOrdenados}
          locais={locais}
          salvando={salvando}
          onFechar={() =>
            setModalGerenciarAberto(
              false
            )
          }
          onSalvarAndar={salvarAndar}
          onExcluirAndar={removerAndar}
          onSalvarLocal={salvarLocal}
          onExcluirLocal={removerLocal}
        />
      )}
    </div>
  );
}

function BotaoTopo({
  icon,
  texto,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {texto}
    </button>
  );
}
