import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers3,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  RefreshCcw,
  RotateCcw,
  Save,
  Trash2,
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
  criarAndarMapa3D,
  criarLocalMapa3D,
  excluirLocalMapa3D,
  listarAndaresMapa3D,
  listarLocaisMapa3D,
} from "../services/mapa3dSupabaseService";

/**
 * MAPA 3D JK 1455 — V4
 *
 * Modelo paramétrico interativo:
 * - fachada contínua espelhada;
 * - embasamento em pedra clara;
 * - pórtico frontal;
 * - heliponto;
 * - estacionamento externo nos fundos;
 * - corredor lateral de serviços;
 * - docas;
 * - central de esgoto a vácuo;
 * - cavalete de gás;
 * - cavalete SABESP;
 * - entrada de energia;
 * - cinco subsolos abaixo do nível da rua.
 *
 * Os ajustes finos de posição ficam concentrados no objeto
 * CONFIG_IMPLANTACAO. Assim você consegue calibrar detalhes
 * depois do primeiro deploy sem alterar toda a modelagem.
 */

const CONFIG_IMPLANTACAO = {
  lote: {
    largura: 18,
    profundidade: 16,
  },

  predio: {
    largura: 8.7,
    profundidade: 7.1,
    podiumAltura: 1.55,
    torreAltura: 10.7,
    torreBaseY: 1.55,
    corVidro: "#0f4f62",
    corPedra: "#ded3bd",
  },

  subsolos: {
    quantidade: 5,
    altura: 0.72,
    largura: 12.2,
    profundidade: 10.4,
  },
};

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
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
  },
  {
    nome: "4º Subsolo",
    ordem: -4,
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
  },
  {
    nome: "3º Subsolo",
    ordem: -3,
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
  },
  {
    nome: "2º Subsolo",
    ordem: -2,
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
  },
  {
    nome: "1º Subsolo",
    ordem: -1,
    cor: "#334155",
    observacao: "Estacionamento, apoio e áreas técnicas",
  },
  {
    nome: "Térreo",
    ordem: 0,
    cor: "#0f766e",
    observacao: "Lobby, recepção, acessos e áreas externas",
  },
  {
    nome: "1º Pav. Técnico",
    ordem: 1,
    cor: "#0369a1",
    observacao: "Áreas técnicas e apoio operacional",
  },
  {
    nome: "2º Pav. Técnico",
    ordem: 2,
    cor: "#0369a1",
    observacao: "Instalações prediais e áreas técnicas",
  },

  ...Array.from(
    {
      length: 14,
    },
    (_, index) => ({
      nome: `${index + 3}º Andar`,
      ordem: index + 3,
      cor: "#2563eb",
      observacao: "Pavimento corporativo",
    })
  ),

  {
    nome: "Cobertura",
    ordem: 17,
    cor: "#7c3aed",
    observacao: "Cobertura técnica",
  },
  {
    nome: "Casa de Máquinas",
    ordem: 18,
    cor: "#7c3aed",
    observacao: "Casa de máquinas",
  },
  {
    nome: "Heliponto",
    ordem: 19,
    cor: "#ea580c",
    observacao: "Heliponto",
  },
];

function ordenarAndares(andares = []) {
  return [...andares].sort(
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

function Box({
  position,
  size,
  color,
  opacity = 1,
  roughness = 0.5,
  metalness = 0.05,
  onClick,
  visible = true,
}) {
  if (!visible) {
    return null;
  }

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
  color,
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
        className={`min-w-[122px] rounded-2xl border px-3 py-2 text-left shadow-lg backdrop-blur transition ${
          ativo
            ? "border-cyan-300 bg-cyan-500 text-white"
            : "border-slate-200 bg-white/95 text-slate-800 hover:bg-white"
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
      roughness={0.52}
    />
  );
}

function GradeRua({
  camada,
}) {
  const destacar =
    camada === "geral" ||
    camada === "externas";

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
        color={
          destacar
            ? "#64748b"
            : "#7c8796"
        }
        roughness={0.95}
      />

      <Box
        position={[3.65, 0.055, -5.4]}
        size={[7.2, 0.075, 3.6]}
        color={
          destacar
            ? "#64748b"
            : "#7c8796"
        }
        roughness={0.95}
      />

      <Box
        position={[0, 0.08, 5.85]}
        size={[15.2, 0.1, 0.72]}
        color="#e8edf1"
        roughness={0.88}
      />

      <Box
        position={[-5.5, 0.08, 0]}
        size={[0.72, 0.1, 11.8]}
        color="#e8edf1"
        roughness={0.88}
      />
    </group>
  );
}

function Carro({
  position,
  rotation = [0, 0, 0],
  color = "#1e293b",
}) {
  return (
    <group
      position={position}
      rotation={rotation}
    >
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
  camada,
}) {
  const mostrar =
    camada === "geral" ||
    camada === "externas";

  if (!mostrar) {
    return null;
  }

  return (
    <group>
      {Array.from(
        {
          length: 7,
        },
        (_, index) => (
          <Vaga
            key={`linha-a-${index}`}
            x={1.1 + index * 0.83}
            z={-6.08}
            ocupada={
              index % 3 === 0
            }
          />
        )
      )}

      {Array.from(
        {
          length: 7,
        },
        (_, index) => (
          <Vaga
            key={`linha-b-${index}`}
            x={1.1 + index * 0.83}
            z={-4.82}
            ocupada={
              index % 4 === 1
            }
          />
        )
      )}

      <Label
        position={[4.8, 0.55, -6.9]}
        titulo="Estacionamento externo"
        subtitulo="Fundos do edifício"
      />
    </group>
  );
}

function AreasTecnicasExternas({
  camada,
}) {
  const mostrar =
    camada === "geral" ||
    camada === "externas" ||
    camada === "sistemas";

  if (!mostrar) {
    return null;
  }

  return (
    <group>
      <Box
        position={[6.05, 0.35, -1.05]}
        size={[1.65, 0.55, 1.5]}
        color="#cbd5e1"
        roughness={0.8}
      />

      <Box
        position={[5.22, 0.34, -1.05]}
        size={[0.08, 0.42, 0.82]}
        color="#111827"
      />

      <Box
        position={[6.92, 0.26, -3.05]}
        size={[1.12, 0.42, 1.12]}
        color="#94a3b8"
        roughness={0.82}
      />

      <Box
        position={[6.92, 0.53, -3.05]}
        size={[0.58, 0.12, 0.58]}
        color="#64748b"
      />

      <Box
        position={[7.13, 0.34, 1.2]}
        size={[0.42, 0.54, 0.66]}
        color="#d97706"
      />

      <Box
        position={[7.13, 0.34, 2.65]}
        size={[0.42, 0.54, 0.66]}
        color="#0284c7"
      />

      <Box
        position={[6.95, 0.46, 4]}
        size={[0.68, 0.78, 1.05]}
        color="#166534"
      />

      <Label
        position={[7.7, 0.95, -1]}
        titulo="Docas"
        subtitulo="Carga e descarga"
      />

      <Label
        position={[7.9, 0.95, -3.15]}
        titulo="Central de esgoto"
        subtitulo="Sistema a vácuo"
      />

      <Label
        position={[8, 0.95, 1.2]}
        titulo="Cavalete de gás"
        subtitulo="Medição externa"
      />

      <Label
        position={[8, 0.95, 2.65]}
        titulo="Cavalete SABESP"
        subtitulo="Medição de água"
      />

      <Label
        position={[7.95, 1.05, 4]}
        titulo="Entrada de energia"
        subtitulo="Área técnica externa"
      />
    </group>
  );
}

function ArcoFrontal({
  x,
}) {
  return (
    <group position={[x, 0.78, 3.58]}>
      <Box
        position={[0, 0, 0]}
        size={[0.7, 0.92, 0.12]}
        color="#142b31"
      />

      <Box
        position={[-0.42, 0, 0.03]}
        size={[0.12, 1.04, 0.18]}
        color="#d8ccb6"
      />

      <Box
        position={[0.42, 0, 0.03]}
        size={[0.12, 1.04, 0.18]}
        color="#d8ccb6"
      />

      <Box
        position={[0, 0.54, 0.03]}
        size={[0.96, 0.14, 0.18]}
        color="#d8ccb6"
      />
    </group>
  );
}

function Embasamento({
  camada,
  selecionado,
  selecionarTerreo,
}) {
  if (camada === "subsolos") {
    return null;
  }

  return (
    <group>
      <Box
        position={[0, 0.775, 0]}
        size={[9.4, 1.55, 7.7]}
        color={
          selecionado
            ? "#67e8f9"
            : "#ded3bd"
        }
        roughness={0.72}
        onClick={(event) => {
          event.stopPropagation();
          selecionarTerreo();
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

      <Linha
        position={[0, 1.43, 4.12]}
        size={[3.12, 0.18, 0.82]}
      />

      {[
        -3.45,
        -2.25,
        -1.05,
        1.05,
        2.25,
        3.45,
      ].map((x) => (
        <ArcoFrontal
          key={x}
          x={x}
        />
      ))}

      <Label
        position={[-4.6, 1.65, 4.4]}
        titulo="Térreo"
        subtitulo="Acesso principal"
        ativo={selecionado}
        onClick={selecionarTerreo}
      />
    </group>
  );
}

function TorreEspelhada({
  andares,
  andarSelecionado,
  setAndarSelecionado,
  camada,
}) {
  if (camada === "subsolos") {
    return null;
  }

  const largura = 8.7;
  const profundidade = 7.1;
  const altura = 10.7;
  const baseY = 1.65;
  const topoY = baseY + altura;

  const pavimentos =
    andares.filter(
      (andar) =>
        Number(andar.ordem) >= 1 &&
        Number(andar.ordem) <= 16
    );

  const alturaPiso =
    altura /
    Math.max(
      1,
      pavimentos.length
    );

  return (
    <group>
      <GlassBox
        position={[
          0,
          baseY + altura / 2,
          0,
        ]}
        size={[
          largura,
          altura,
          profundidade,
        ]}
        color="#0f4f62"
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
              key={`vertical-frente-${index}`}
              position={[
                x,
                baseY + altura / 2,
                profundidade / 2 + 0.012,
              ]}
              size={[
                0.025,
                altura,
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
              key={`vertical-lateral-${index}`}
              position={[
                largura / 2 + 0.012,
                baseY + altura / 2,
                z,
              ]}
              size={[
                0.03,
                altura,
                0.025,
              ]}
              color="#7996a0"
            />
          );
        }
      )}

      {pavimentos.map(
        (
          andar,
          index
        ) => {
          const y =
            baseY +
            index * alturaPiso +
            alturaPiso / 2;

          const selecionado =
            andarSelecionado?.id ===
            andar.id;

          return (
            <group key={andar.id}>
              <Box
                position={[
                  0,
                  y,
                  0,
                ]}
                size={[
                  largura + 0.05,
                  alturaPiso * 0.94,
                  profundidade + 0.05,
                ]}
                color={
                  selecionado
                    ? "#22d3ee"
                    : "#0f4f62"
                }
                opacity={
                  selecionado
                    ? 0.52
                    : 0.025
                }
                metalness={0.7}
                roughness={0.1}
                onClick={(event) => {
                  event.stopPropagation();

                  setAndarSelecionado(
                    andar
                  );
                }}
              />

              <Linha
                position={[
                  0,
                  baseY +
                    index *
                      alturaPiso,
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

      <Label
        position={[
          -5.5,
          baseY +
            altura * 0.64,
          1.3,
        ]}
        titulo="Pavimentos corporativos"
        subtitulo="Torre espelhada"
      />

      <Box
        position={[
          0,
          topoY + 0.36,
          0,
        ]}
        size={[
          largura + 0.85,
          0.72,
          profundidade + 0.78,
        ]}
        color="#d8ccb6"
        roughness={0.68}
      />

      <Linha
        position={[
          0,
          topoY + 0.02,
          0,
        ]}
        size={[
          largura + 1.05,
          0.14,
          profundidade + 0.98,
        ]}
      />

      <Linha
        position={[
          0,
          topoY + 0.76,
          0,
        ]}
        size={[
          largura + 1.1,
          0.16,
          profundidade + 1,
        ]}
      />

      {Array.from(
        {
          length: 10,
        },
        (_, index) => (
          <Box
            key={`coroamento-${index}`}
            position={[
              -3.75 +
                index * 0.84,
              topoY + 0.37,
              profundidade / 2 +
                0.42,
            ]}
            size={[
              0.42,
              0.28,
              0.04,
            ]}
            color="#184e5c"
            roughness={0.18}
            metalness={0.55}
          />
        )
      )}

      <Box
        position={[
          0,
          topoY + 1.02,
          0,
        ]}
        size={[
          7.1,
          0.18,
          5.75,
        ]}
        color="#c8bda9"
        roughness={0.8}
      />

      <Box
        position={[
          0,
          topoY + 1.17,
          0,
        ]}
        size={[
          4.6,
          0.12,
          3.95,
        ]}
        color="#3b82a0"
        roughness={0.58}
      />

      <mesh
        position={[
          0,
          topoY + 1.26,
          0,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <ringGeometry
          args={[
            1,
            1.08,
            64,
          ]}
        />

        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      <Linha
        position={[
          0,
          topoY + 1.28,
          0,
        ]}
        size={[
          1.32,
          0.025,
          0.12,
        ]}
        color="#f8fafc"
      />

      <Linha
        position={[
          0,
          topoY + 1.28,
          0,
        ]}
        size={[
          0.12,
          0.025,
          1.32,
        ]}
        color="#f8fafc"
      />
    </group>
  );
}

function Subsolos({
  andares,
  locais,
  camada,
  andarSelecionado,
  setAndarSelecionado,
}) {
  const mostrar =
    camada === "geral" ||
    camada === "subsolos";

  if (!mostrar) {
    return null;
  }

  const lista =
    ordenarAndares(
      andares.filter(
        (andar) =>
          Number(
            andar.ordem
          ) < 0
      )
    ).reverse();

  return (
    <group>
      <Box
        position={[
          0,
          -1.91,
          0,
        ]}
        size={[
          15.8,
          3.99,
          12.85,
        ]}
        color="#765844"
        opacity={
          camada === "subsolos"
            ? 0.16
            : 0.09
        }
        roughness={1}
      />

      {lista.map(
        (
          andar,
          index
        ) => {
          const y =
            -(index + 0.58) *
            0.72;

          const selecionado =
            andarSelecionado?.id ===
            andar.id;

          const quantidade =
            locaisDoAndar(
              locais,
              andar.id
            ).length;

          return (
            <group key={andar.id}>
              <Box
                position={[
                  0,
                  y,
                  0,
                ]}
                size={[
                  12.2,
                  0.576,
                  10.4,
                ]}
                color={
                  selecionado
                    ? "#22d3ee"
                    : "#334155"
                }
                opacity={
                  camada ===
                  "subsolos"
                    ? 0.9
                    : 0.58
                }
                roughness={0.76}
                onClick={(event) => {
                  event.stopPropagation();

                  setAndarSelecionado(
                    andar
                  );
                }}
              />

              {[
                -4.2,
                -1.4,
                1.4,
                4.2,
              ].map((x) => (
                <Box
                  key={`${andar.id}-${x}`}
                  position={[
                    x,
                    y,
                    -1.8,
                  ]}
                  size={[
                    0.16,
                    0.66,
                    0.16,
                  ]}
                  color="#94a3b8"
                />
              ))}

              <Label
                position={[
                  -7.05,
                  y,
                  0,
                ]}
                titulo={andar.nome.replace(
                  "º Subsolo",
                  "SS"
                )}
                subtitulo={`${quantidade} local(is)`}
                ativo={selecionado}
                onClick={() =>
                  setAndarSelecionado(
                    andar
                  )
                }
              />
            </group>
          );
        }
      )}

      <Label
        position={[
          -7.2,
          0.05,
          2,
        ]}
        titulo="Nível da rua"
        subtitulo="0,00 m"
      />
    </group>
  );
}

function ModeloJK1455({
  andares,
  locais,
  camada,
  andarSelecionado,
  setAndarSelecionado,
}) {
  const terreo =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) === 0
    );

  return (
    <group>
      <GradeRua
        camada={camada}
      />

      <EstacionamentoFundos
        camada={camada}
      />

      <AreasTecnicasExternas
        camada={camada}
      />

      <Embasamento
        camada={camada}
        selecionado={
          andarSelecionado?.id ===
          terreo?.id
        }
        selecionarTerreo={() => {
          if (terreo) {
            setAndarSelecionado(
              terreo
            );
          }
        }}
      />

      <TorreEspelhada
        andares={andares}
        andarSelecionado={
          andarSelecionado
        }
        setAndarSelecionado={
          setAndarSelecionado
        }
        camada={camada}
      />

      <Subsolos
        andares={andares}
        locais={locais}
        camada={camada}
        andarSelecionado={
          andarSelecionado
        }
        setAndarSelecionado={
          setAndarSelecionado
        }
      />
    </group>
  );
}

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

function CadastroLocal({
  andarSelecionado,
  onSalvar,
  salvando,
}) {
  const [
    form,
    setForm,
  ] = useState(
    campoVazio()
  );

  useEffect(() => {
    setForm(
      campoVazio()
    );
  }, [
    andarSelecionado?.id,
  ]);

  if (!andarSelecionado) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="font-black text-slate-900">
        Cadastrar local ou equipamento
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        Andar selecionado:{" "}
        <strong>
          {
            andarSelecionado.nome
          }
        </strong>
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={form.nome}
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                nome: event
                  .target
                  .value,
              })
            )
          }
          placeholder="Nome"
          className="rounded-2xl border border-slate-200 p-3 text-sm"
        />

        <select
          value={form.tipo}
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                tipo: event
                  .target
                  .value,
              })
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {TIPOS_LOCAL.map(
            (
              tipo
            ) => (
              <option
                key={
                  tipo
                }
              >
                {
                  tipo
                }
              </option>
            )
          )}
        </select>

        <input
          value={
            form.responsavel
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                responsavel:
                  event
                    .target
                    .value,
              })
            )
          }
          placeholder="Responsável"
          className="rounded-2xl border border-slate-200 p-3 text-sm"
        />

        <select
          value={
            form.status
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                status:
                  event
                    .target
                    .value,
              })
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          <option>
            Ativo
          </option>

          <option>
            Atenção
          </option>

          <option>
            Manutenção
          </option>

          <option>
            Inativo
          </option>
        </select>

        <textarea
          value={
            form.descricao
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                descricao:
                  event
                    .target
                    .value,
              })
            )
          }
          placeholder="Descrição"
          className="min-h-[74px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
        />

        <textarea
          value={
            form.observacao
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                observacao:
                  event
                    .target
                    .value,
              })
            )
          }
          placeholder="Observações operacionais"
          className="min-h-[64px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
        />
      </div>

      <button
        type="button"
        onClick={async () => {
          await onSalvar(
            form
          );

          setForm(
            campoVazio()
          );
        }}
        disabled={
          salvando ||
          !form.nome
        }
        className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50"
      >
        {salvando ? (
          <Loader2
            size={18}
            className="animate-spin"
          />
        ) : (
          <Save
            size={18}
          />
        )}

        Salvar
      </button>
    </div>
  );
}

function PainelDetalhes({
  andarSelecionado,
  locaisSelecionados,
  onFechar,
  onExcluir,
}) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">
            Andar selecionado
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-900">
            {
              andarSelecionado?.nome ||
              "-"
            }
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {
              andarSelecionado?.observacao ||
              "Sem observações cadastradas."
            }
          </p>
        </div>

        <button
          type="button"
          onClick={
            onFechar
          }
          className="rounded-xl p-2 hover:bg-slate-100"
        >
          <Minimize2
            size={18}
          />
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100">
        <div className="bg-slate-50 px-4 py-3 font-black text-slate-800">
          O que tem neste andar
        </div>

        <div className="max-h-[360px] divide-y divide-slate-100 overflow-auto">
          {locaisSelecionados.length ===
            0 && (
            <div className="p-4 text-sm text-slate-400">
              Nenhum local ou equipamento cadastrado.
            </div>
          )}

          {locaisSelecionados.map(
            (
              local
            ) => (
              <div
                key={
                  local.id
                }
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">
                      {
                        local.nome
                      }
                    </p>

                    <p className="text-xs font-bold text-blue-700">
                      {
                        local.tipo
                      }
                    </p>

                    {local.descricao && (
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          local.descricao
                        }
                      </p>
                    )}

                    {local.responsavel && (
                      <p className="mt-1 text-xs text-slate-400">
                        Responsável:{" "}
                        {
                          local.responsavel
                        }
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onExcluir(
                        local
                      )
                    }
                    className="rounded-xl p-2 text-rose-600 hover:bg-rose-50"
                    title="Excluir"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function Mapa3D() {
  const [
    andares,
    setAndares,
  ] = useState([]);

  const [
    locais,
    setLocais,
  ] = useState([]);

  const [
    andarSelecionado,
    setAndarSelecionado,
  ] = useState(null);

  const [
    camada,
    setCamada,
  ] = useState("geral");

  const [
    painelAberto,
    setPainelAberto,
  ] = useState(true);

  const [
    menuCamadasAberto,
    setMenuCamadasAberto,
  ] = useState(true);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    resetCamera,
    setResetCamera,
  ] = useState(0);

  const andaresOrdenados =
    useMemo(
      () =>
        ordenarAndares(
          andares
        ),
      [
        andares,
      ]
    );

  const locaisSelecionados =
    useMemo(() => {
      if (
        !andarSelecionado
      ) {
        return [];
      }

      return locaisDoAndar(
        locais,
        andarSelecionado.id
      );
    }, [
      andarSelecionado,
      locais,
    ]);

  async function carregar() {
    setCarregando(
      true
    );

    setErro("");

    try {
      const [
        listaAndares,
        listaLocais,
      ] =
        await Promise.all([
          listarAndaresMapa3D(),
          listarLocaisMapa3D(),
        ]);

      setAndares(
        listaAndares
      );

      setLocais(
        listaLocais
      );

      if (
        !andarSelecionado &&
        listaAndares.length
      ) {
        setAndarSelecionado(
          listaAndares.find(
            (
              andar
            ) =>
              Number(
                andar.ordem
              ) === 0
          ) ||
            listaAndares[0]
        );
      }
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível carregar o Mapa 3D. Confira o Supabase."
      );
    } finally {
      setCarregando(
        false
      );
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarEstruturaBase() {
    setSalvando(
      true
    );

    setErro("");

    try {
      const atuais =
        await listarAndaresMapa3D();

      for (const andar of ANDARES_BASE) {
        const existente =
          atuais.some(
            (
              item
            ) =>
              Number(
                item.ordem
              ) ===
              Number(
                andar.ordem
              )
          );

        if (
          !existente
        ) {
          await criarAndarMapa3D({
            ...andar,
            altura: 1,
          });
        }
      }

      await carregar();
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível criar a estrutura base."
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function salvarLocal(
    form
  ) {
    if (
      !andarSelecionado
    ) {
      return;
    }

    setSalvando(
      true
    );

    setErro("");

    try {
      const criado =
        await criarLocalMapa3D({
          ...form,
          andarId:
            andarSelecionado.id,
        });

      setLocais(
        (
          anteriores
        ) => [
          criado,
          ...anteriores,
        ]
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível salvar o local ou equipamento."
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function excluirLocal(
    local
  ) {
    const confirmar =
      window.confirm(
        `Excluir "${local.nome}"?`
      );

    if (
      !confirmar
    ) {
      return;
    }

    try {
      await excluirLocalMapa3D(
        local.id
      );

      setLocais(
        (
          anteriores
        ) =>
          anteriores.filter(
            (
              item
            ) =>
              item.id !==
              local.id
          )
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível excluir o local."
      );
    }
  }

  if (
    carregando
  ) {
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
          <AlertTriangle
            size={18}
          />

          <span>
            {
              erro
            }
          </span>
        </div>
      )}

      {andares.length ===
      0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <Building2
            size={42}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-3 text-xl font-black text-slate-900">
            Estrutura ainda não cadastrada
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Crie os pavimentos base do JK 1455.
          </p>

          <button
            type="button"
            onClick={
              criarEstruturaBase
            }
            disabled={
              salvando
            }
            className="mx-auto mt-5 flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {salvando ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Layers3
                size={18}
              />
            )}

            Criar estrutura base
          </button>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-5 ${
            painelAberto
              ? "2xl:grid-cols-[1.55fr_0.78fr]"
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
                  Torre espelhada, áreas externas nos fundos e cinco subsolos abaixo do nível da rua.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setResetCamera(
                      (
                        valor
                      ) =>
                        valor +
                        1
                    )
                  }
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700"
                >
                  <RotateCcw
                    size={16}
                  />

                  Reposicionar
                </button>

                <button
                  type="button"
                  onClick={
                    carregar
                  }
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700"
                >
                  <RefreshCcw
                    size={16}
                  />

                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPainelAberto(
                      (
                        valor
                      ) =>
                        !valor
                    )
                  }
                  className="flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white"
                >
                  {painelAberto ? (
                    <Minimize2
                      size={16}
                    />
                  ) : (
                    <Maximize2
                      size={16}
                    />
                  )}

                  {painelAberto
                    ? "Minimizar painel"
                    : "Abrir painel"}
                </button>
              </div>
            </div>

            <div className="grid min-h-[860px] grid-cols-1 xl:grid-cols-[220px_1fr]">
              <aside className="border-r border-slate-100 bg-slate-50/80 p-4">
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Building2
                      size={22}
                      className="text-blue-600"
                    />

                    <div>
                      <p className="font-black text-slate-900">
                        Edifício JK 1455
                      </p>

                      <p className="text-[11px] text-slate-400">
                        Gestão predial
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl bg-slate-50 p-2">
                      <p className="text-slate-400">
                        Andares
                      </p>

                      <p className="font-black text-slate-900">
                        {
                          andares.length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-2">
                      <p className="text-slate-400">
                        Subsolos
                      </p>

                      <p className="font-black text-slate-900">
                        5
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuCamadasAberto(
                        (
                          valor
                        ) =>
                          !valor
                      )
                    }
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-black text-slate-700 hover:bg-white"
                  >
                    Navegação

                    {menuCamadasAberto ? (
                      <ChevronUp
                        size={16}
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                      />
                    )}
                  </button>

                  {menuCamadasAberto && (
                    <div className="mt-1 space-y-1">
                      {CAMADAS.map(
                        (
                          item
                        ) => (
                          <button
                            type="button"
                            key={
                              item.id
                            }
                            onClick={() =>
                              setCamada(
                                item.id
                              )
                            }
                            className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-bold transition ${
                              camada ===
                              item.id
                                ? "bg-blue-600 text-white"
                                : "text-slate-600 hover:bg-white"
                            }`}
                          >
                            <Eye
                              size={15}
                            />

                            {
                              item.nome
                            }
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </aside>

              <div className="bg-gradient-to-b from-slate-50 via-blue-50 to-slate-100">
                <Canvas
                  shadows
                  dpr={[
                    1,
                    1.55,
                  ]}
                  key={
                    resetCamera
                  }
                >
                  <PerspectiveCamera
                    makeDefault
                    position={[
                      22,
                      17,
                      24,
                    ]}
                    fov={46}
                  />

                  <ambientLight
                    intensity={
                      0.72
                    }
                  />

                  <directionalLight
                    position={[
                      10,
                      15,
                      9,
                    ]}
                    intensity={
                      1.32
                    }
                    castShadow
                  />

                  <pointLight
                    position={[
                      -9,
                      9,
                      -8,
                    ]}
                    intensity={
                      0.55
                    }
                    color="#dbeafe"
                  />

                  <ModeloJK1455
                    andares={
                      andaresOrdenados
                    }
                    locais={
                      locais
                    }
                    camada={
                      camada
                    }
                    andarSelecionado={
                      andarSelecionado
                    }
                    setAndarSelecionado={(
                      andar
                    ) => {
                      setAndarSelecionado(
                        andar
                      );

                      setPainelAberto(
                        true
                      );
                    }}
                  />

                  <ContactShadows
                    opacity={
                      0.25
                    }
                    scale={26}
                    blur={3}
                    far={8}
                    position={[
                      0,
                      -4.25,
                      0,
                    ]}
                  />

                  <Environment
                    preset="city"
                  />

                  <OrbitControls
                    makeDefault
                    enablePan
                    enableZoom
                    enableRotate
                    minDistance={8}
                    maxDistance={72}
                    target={[
                      0,
                      4.2,
                      0,
                    ]}
                    maxPolarAngle={
                      Math.PI /
                      2.02
                    }
                  />
                </Canvas>
              </div>
            </div>
          </section>

          {painelAberto && (
            <section className="space-y-5">
              <PainelDetalhes
                andarSelecionado={
                  andarSelecionado
                }
                locaisSelecionados={
                  locaisSelecionados
                }
                onFechar={() =>
                  setPainelAberto(
                    false
                  )
                }
                onExcluir={
                  excluirLocal
                }
              />

              <CadastroLocal
                andarSelecionado={
                  andarSelecionado
                }
                onSalvar={
                  salvarLocal
                }
                salvando={
                  salvando
                }
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
