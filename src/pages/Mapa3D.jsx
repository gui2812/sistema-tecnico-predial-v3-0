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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  atualizarAndarMapa3D,
  atualizarItemExternoMapa3D,
  atualizarLocalMapa3D,
  criarAndarMapa3D,
  criarArquivoMapa3D,
  criarItemExternoMapa3D,
  criarLocalMapa3D,
  excluirAndarMapa3D,
  excluirArquivoMapa3D,
  excluirItemExternoMapa3D,
  excluirLocalMapa3D,
  listarAndaresMapa3D,
  listarArquivosMapa3DPorEntidade,
  listarItensExternosMapa3D,
  listarLocaisMapa3D,
} from "../services/mapa3dSupabaseService";

/**
 * MAPA 3D JK 1455 — V6 FINAL MESCLADA
 *
 * Preserva a modelagem visual da versão anterior e integra:
 * - torre contínua espelhada;
 * - embasamento em pedra clara;
 * - heliponto;
 * - cobertura e casa de máquinas clicáveis;
 * - cinco subsolos abaixo do nível da rua;
 * - estacionamento externo nos fundos;
 * - três fontes e paisagismo frontal;
 * - itens externos editáveis vindos do Supabase;
 * - upload de foto, câmera e planta/PDF;
 * - CRUD de andares, locais e itens externos;
 * - posicionamento de item externo clicando diretamente no terreno;
 * - opção de superfície ou subterrâneo.
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
    altura: 0.78,
    largura: 12.4,
    profundidade: 10.6,
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

const ANDARES_BASE = [
  {
    nome: "5º Subsolo",
    ordem: -5,
    altura: 1,
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
    categoria: "subsolo",
    tituloCurto: "5SS",
  },
  {
    nome: "4º Subsolo",
    ordem: -4,
    altura: 1,
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
    categoria: "subsolo",
    tituloCurto: "4SS",
  },
  {
    nome: "3º Subsolo",
    ordem: -3,
    altura: 1,
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
    categoria: "subsolo",
    tituloCurto: "3SS",
  },
  {
    nome: "2º Subsolo",
    ordem: -2,
    altura: 1,
    cor: "#334155",
    observacao: "Estacionamento e áreas técnicas",
    categoria: "subsolo",
    tituloCurto: "2SS",
  },
  {
    nome: "1º Subsolo",
    ordem: -1,
    altura: 1,
    cor: "#334155",
    observacao: "Estacionamento, apoio e áreas técnicas",
    categoria: "subsolo",
    tituloCurto: "1SS",
  },
  {
    nome: "Térreo",
    ordem: 0,
    altura: 1,
    cor: "#0f766e",
    observacao: "Lobby, recepção, acessos e áreas externas",
    categoria: "terreo",
    tituloCurto: "Térreo",
  },
  {
    nome: "1º Pav. Técnico",
    ordem: 1,
    altura: 1,
    cor: "#0369a1",
    observacao: "Áreas técnicas e apoio operacional",
    categoria: "tecnico",
    tituloCurto: "1º Técnico",
  },
  {
    nome: "2º Pav. Técnico",
    ordem: 2,
    altura: 1,
    cor: "#0369a1",
    observacao: "Instalações prediais e áreas técnicas",
    categoria: "tecnico",
    tituloCurto: "2º Técnico",
  },

  ...Array.from(
    {
      length: 14,
    },
    (_, index) => ({
      nome: `${index + 3}º Andar`,
      ordem: index + 3,
      altura: 1,
      cor: "#2563eb",
      observacao: "Pavimento corporativo",
      categoria: "comercial",
      tituloCurto: `${index + 3}º`,
    })
  ),

  {
    nome: "Cobertura",
    ordem: 17,
    altura: 1,
    cor: "#7c3aed",
    observacao: "Cobertura técnica",
    categoria: "cobertura",
    tituloCurto: "Cobertura",
  },
  {
    nome: "Casa de Máquinas",
    ordem: 18,
    altura: 1,
    cor: "#7c3aed",
    observacao: "Casa de máquinas",
    categoria: "tecnico",
    tituloCurto: "Casa de Máquinas",
  },
  {
    nome: "Heliponto",
    ordem: 19,
    altura: 1,
    cor: "#ea580c",
    observacao: "Heliponto",
    categoria: "cobertura",
    tituloCurto: "Heliponto",
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

function itemEhEstacionamento(
  item
) {
  return (
    item.nome
      ?.trim()
      .toLowerCase() ===
    "estacionamento externo"
  );
}

function campoLocalVazio() {
  return {
    id: "",
    andarId: "",
    nome: "",
    tipo: "Técnico",
    descricao: "",
    observacao: "",
    responsavel: "",
    status: "Ativo",
  };
}

function campoAndarVazio() {
  return {
    id: "",
    nome: "",
    ordem: 20,
    altura: 1,
    cor: "#2563eb",
    observacao: "",
    categoria: "comercial",
    tituloCurto: "",
    mostrarRotulo: true,
  };
}

function campoItemVazio() {
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
  item,
  selecionado,
  onSelect,
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
            x={
              1.1 +
              index * 0.83
            }
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
            x={
              1.1 +
              index * 0.83
            }
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
        ativo={selecionado}
        onClick={() =>
          item &&
          onSelect(item)
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
      scale={[
        escala,
        escala,
        escala,
      ]}
    >
      <mesh
        position={[0, 0.04, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[
            0.62,
            0.7,
            0.16,
            36,
          ]}
        />

        <meshStandardMaterial
          color="#d7c8ae"
          roughness={0.78}
        />
      </mesh>

      <mesh
        position={[0, 0.14, 0]}
      >
        <cylinderGeometry
          args={[
            0.49,
            0.52,
            0.08,
            36,
          ]}
        />

        <meshStandardMaterial
          color="#7dd3fc"
          roughness={0.28}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[0, 0.45, 0]}
      >
        <cylinderGeometry
          args={[
            0.07,
            0.09,
            0.62,
            18,
          ]}
        />

        <meshStandardMaterial
          color="#d7c8ae"
        />
      </mesh>

      <mesh
        position={[0, 0.78, 0]}
      >
        <sphereGeometry
          args={[
            0.1,
            16,
            16,
          ]}
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
  escala = 1,
}) {
  return (
    <group
      position={position}
      scale={[
        escala,
        escala,
        escala,
      ]}
    >
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
          args={[
            0.32,
            16,
            16,
          ]}
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
          key={`arvore-frente-${x}`}
          position={[
            x,
            0.12,
            5.3,
          ]}
          escala={0.76}
        />
      ))}

      {[
        -2.8,
        -1.05,
        0.7,
        2.45,
      ].map((z) => (
        <Arvore
          key={`arvore-esquerda-${z}`}
          position={[
            -5.55,
            0.12,
            z,
          ]}
          escala={0.7}
        />
      ))}
    </group>
  );
}

function posicaoItem(
  item
) {
  const x =
    Number(
      item.x || 0
    );

  const y =
    Number(
      item.y || 0
    );

  const z =
    Number(
      item.z || 0
    );

  if (
    item.lado === "fundos"
  ) {
    return [
      x,
      y,
      -4.6 + z,
    ];
  }

  if (
    item.lado === "esquerda"
  ) {
    return [
      -5.7 + x,
      y,
      z,
    ];
  }

  if (
    item.lado === "direita"
  ) {
    return [
      7.1 + x,
      y,
      z,
    ];
  }

  if (
    item.lado === "centro"
  ) {
    return [
      x,
      y,
      z,
    ];
  }

  return [
    x,
    y,
    5.25 + z,
  ];
}

function offsetsPorClique(
  lado,
  ponto
) {
  const x =
    Number(
      ponto.x.toFixed(2)
    );

  const y = 0.1;

  const z =
    Number(
      ponto.z.toFixed(2)
    );

  if (
    lado === "fundos"
  ) {
    return {
      x,
      y,
      z: Number(
        (
          z +
          4.6
        ).toFixed(2)
      ),
    };
  }

  if (
    lado === "esquerda"
  ) {
    return {
      x: Number(
        (
          x +
          5.7
        ).toFixed(2)
      ),
      y,
      z,
    };
  }

  if (
    lado === "direita"
  ) {
    return {
      x: Number(
        (
          x -
          7.1
        ).toFixed(2)
      ),
      y,
      z,
    };
  }

  if (
    lado === "centro"
  ) {
    return {
      x,
      y,
      z,
    };
  }

  return {
    x,
    y,
    z: Number(
      (
        z -
        5.25
      ).toFixed(2)
    ),
  };
}

function ItemExternoVisual({
  item,
  selecionado,
  onSelect,
}) {
  if (
    itemEhEstacionamento(
      item
    )
  ) {
    return null;
  }

  const [
    x,
    yBase,
    z,
  ] =
    posicaoItem(
      item
    );

  const subterraneo =
    item.modoImplantacao ===
    "subterraneo";

  const largura =
    Math.max(
      0.18,
      Number(
        item.largura || 0.8
      )
    );

  const altura =
    Math.max(
      0.12,
      Number(
        item.altura || 0.6
      )
    );

  const profundidade =
    Math.max(
      0.18,
      Number(
        item.profundidade ||
          0.8
      )
    );

  const y =
    subterraneo
      ? -Math.max(
          0.03,
          altura * 0.22
        )
      : yBase +
        altura / 2;

  function clicar(
    event
  ) {
    event.stopPropagation();

    onSelect(
      item
    );
  }

  return (
    <group
      position={[
        x,
        y,
        z,
      ]}
    >
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
              item.cor ||
              "#64748b"
            }
            roughness={0.68}
          />
        </mesh>
      ) : item.tipoVisual ===
        "poste" ? (
        <group>
          <mesh
            onClick={clicar}
            position={[
              0,
              altura / 2,
              0,
            ]}
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
                item.cor ||
                "#64748b"
              }
            />
          </mesh>

          <mesh
            position={[
              0,
              altura + 0.12,
              0,
            ]}
          >
            <sphereGeometry
              args={[
                Math.max(
                  0.1,
                  largura / 3.4
                ),
                18,
                18,
              ]}
            />

            <meshStandardMaterial
              color="#fde68a"
              emissive="#fde68a"
              emissiveIntensity={
                0.35
              }
            />
          </mesh>
        </group>
      ) : item.tipoVisual ===
        "equipamento" ? (
        <group>
          <Box
            position={[0, 0, 0]}
            size={[
              largura,
              altura,
              profundidade,
            ]}
            color={
              item.cor ||
              "#64748b"
            }
            roughness={0.72}
            onClick={clicar}
          />

          <Box
            position={[
              0,
              altura / 2 +
                0.08,
              0,
            ]}
            size={[
              largura *
                0.7,
              0.12,
              profundidade *
                0.7,
            ]}
            color="#94a3b8"
          />
        </group>
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
            item.cor ||
            "#64748b"
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
            : altura / 2 +
              0.55,
          0,
        ]}
        titulo={
          item.nome
        }
        subtitulo={`${item.lado} • ${
          subterraneo
            ? "subterrâneo"
            : "superfície"
        }`}
        ativo={
          selecionado
        }
        onClick={() =>
          onSelect(
            item
          )
        }
      />
    </group>
  );
}

function ItensExternos({
  itens,
  camada,
  itemSelecionado,
  onSelect,
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
      {ordenarItens(
        itens
      ).map((item) => (
        <ItemExternoVisual
          key={item.id}
          item={item}
          selecionado={
            itemSelecionado?.id ===
            item.id
          }
          onSelect={
            onSelect
          }
        />
      ))}
    </group>
  );
}

function PlanoPosicionamento({
  ativo,
  lado,
  onEscolher,
}) {
  if (!ativo) {
    return null;
  }

  return (
    <group>
      <mesh
        position={[0, 0.13, 0]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
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
        <planeGeometry
          args={[
            17.2,
            15.2,
          ]}
        />

        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.18}
        />
      </mesh>

      <Html
        position={[
          0,
          2.4,
          5.8,
        ]}
        center
      >
        <div className="rounded-2xl border border-cyan-200 bg-white/95 px-4 py-3 text-center shadow-xl">
          <p className="text-xs font-black text-cyan-800">
            Modo posicionamento ativo
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-500">
            Clique no terreno para escolher o local.
          </p>
        </div>
      </Html>
    </group>
  );
}

function ArcoFrontal({
  x,
}) {
  return (
    <group
      position={[
        x,
        0.78,
        3.58,
      ]}
    >
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
  if (
    camada === "subsolos"
  ) {
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
        onClick={
          selecionarTerreo
        }
      />
    </group>
  );
}

function TorreEspelhada({
  andares,
  andarSelecionado,
  onSelect,
  camada,
}) {
  if (
    camada === "subsolos"
  ) {
    return null;
  }

  const largura = 8.7;
  const profundidade = 7.1;
  const altura = 10.7;
  const baseY = 1.65;
  const topoY =
    baseY +
    altura;

  const pavimentos =
    andares.filter(
      (andar) =>
        Number(
          andar.ordem
        ) >= 1 &&
        Number(
          andar.ordem
        ) <= 16
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
          baseY +
            altura / 2,
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
            (index *
              largura) /
              13;

          return (
            <Linha
              key={`vertical-frente-${index}`}
              position={[
                x,
                baseY +
                  altura / 2,
                profundidade /
                  2 +
                  0.012,
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
            -profundidade /
              2 +
            (index *
              profundidade) /
              9;

          return (
            <Linha
              key={`vertical-lateral-${index}`}
              position={[
                largura /
                  2 +
                  0.012,
                baseY +
                  altura / 2,
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
            index *
              alturaPiso +
            alturaPiso / 2;

          const selecionado =
            andarSelecionado?.id ===
            andar.id;

          return (
            <group
              key={
                andar.id
              }
            >
              <Box
                position={[
                  0,
                  y,
                  0,
                ]}
                size={[
                  largura +
                    0.05,
                  alturaPiso *
                    0.94,
                  profundidade +
                    0.05,
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
                metalness={
                  0.7
                }
                roughness={
                  0.1
                }
                onClick={(event) => {
                  event.stopPropagation();

                  onSelect(
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
                  profundidade /
                    2 +
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
            altura *
              0.64,
          1.3,
        ]}
        titulo="Pavimentos corporativos"
        subtitulo="Torre espelhada"
      />

      <Box
        position={[
          0,
          topoY +
            0.36,
          0,
        ]}
        size={[
          largura +
            0.85,
          0.72,
          profundidade +
            0.78,
        ]}
        color="#d8ccb6"
        roughness={0.68}
      />

      <Linha
        position={[
          0,
          topoY +
            0.02,
          0,
        ]}
        size={[
          largura +
            1.05,
          0.14,
          profundidade +
            0.98,
        ]}
      />

      <Linha
        position={[
          0,
          topoY +
            0.76,
          0,
        ]}
        size={[
          largura +
            1.1,
          0.16,
          profundidade +
            1,
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
                index *
                  0.84,
              topoY +
                0.37,
              profundidade /
                2 +
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
    </group>
  );
}

function AreasTecnicasSuperiores({
  andares,
  selecionado,
  onSelect,
  camada,
}) {
  if (
    camada === "subsolos"
  ) {
    return null;
  }

  const cobertura =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) === 17
    );

  const maquinas =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) === 18
    );

  const heliponto =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) === 19
    );

  const topoY = 12.35;

  function clicar(
    andar
  ) {
    return (
      event
    ) => {
      event.stopPropagation();

      if (
        andar
      ) {
        onSelect(
          andar
        );
      }
    };
  }

  return (
    <group>
      <Box
        position={[
          0,
          topoY +
            1.02,
          0,
        ]}
        size={[
          7.1,
          0.18,
          5.75,
        ]}
        color={
          selecionado?.id ===
          cobertura?.id
            ? "#c4b5fd"
            : "#c8bda9"
        }
        roughness={0.8}
        onClick={
          clicar(
            cobertura
          )
        }
      />

      <Box
        position={[
          1.3,
          topoY +
            1.42,
          0.55,
        ]}
        size={[
          2.2,
          0.72,
          1.85,
        ]}
        color={
          selecionado?.id ===
          maquinas?.id
            ? "#c4b5fd"
            : "#a8a29e"
        }
        roughness={0.76}
        onClick={
          clicar(
            maquinas
          )
        }
      />

      <Box
        position={[
          -0.85,
          topoY +
            1.17,
          -0.35,
        ]}
        size={[
          4.6,
          0.12,
          3.95,
        ]}
        color={
          selecionado?.id ===
          heliponto?.id
            ? "#fdba74"
            : "#3b82a0"
        }
        roughness={0.58}
        onClick={
          clicar(
            heliponto
          )
        }
      />

      <mesh
        position={[
          -0.85,
          topoY +
            1.26,
          -0.35,
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

        <meshStandardMaterial
          color="#f8fafc"
        />
      </mesh>

      <Linha
        position={[
          -0.85,
          topoY +
            1.28,
          -0.35,
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
          -0.85,
          topoY +
            1.28,
          -0.35,
        ]}
        size={[
          0.12,
          0.025,
          1.32,
        ]}
        color="#f8fafc"
      />

      {heliponto && (
        <Label
          position={[
            -0.85,
            topoY +
              2.05,
            -0.35,
          ]}
          titulo="Heliponto"
          subtitulo="Área técnica superior"
          ativo={
            selecionado?.id ===
            heliponto.id
          }
          onClick={() =>
            onSelect(
              heliponto
            )
          }
        />
      )}
    </group>
  );
}

function Subsolos({
  andares,
  locais,
  camada,
  andarSelecionado,
  onSelect,
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
          -2.05,
          0,
        ]}
        size={[
          15.8,
          4.35,
          12.85,
        ]}
        color="#765844"
        opacity={
          camada ===
          "subsolos"
            ? 0.14
            : 0.06
        }
        roughness={1}
      />

      {lista.map(
        (
          andar,
          index
        ) => {
          const y =
            -(
              index +
              0.58
            ) *
            CONFIG_IMPLANTACAO
              .subsolos
              .altura;

          const selecionado =
            andarSelecionado?.id ===
            andar.id;

          const quantidade =
            locaisDoAndar(
              locais,
              andar.id
            ).length;

          return (
            <group
              key={
                andar.id
              }
            >
              <Box
                position={[
                  0,
                  y,
                  0,
                ]}
                size={[
                  CONFIG_IMPLANTACAO
                    .subsolos
                    .largura,
                  0.62,
                  CONFIG_IMPLANTACAO
                    .subsolos
                    .profundidade,
                ]}
                color={
                  selecionado
                    ? "#22d3ee"
                    : "#475569"
                }
                opacity={
                  camada ===
                  "subsolos"
                    ? 0.98
                    : 0.76
                }
                roughness={
                  0.72
                }
                onClick={(event) => {
                  event.stopPropagation();

                  onSelect(
                    andar
                  );
                }}
              />

              {[
                -4.5,
                -1.5,
                1.5,
                4.5,
              ].map((x) => (
                <Box
                  key={`${andar.id}-pillar-${x}`}
                  position={[
                    x,
                    y,
                    -2,
                  ]}
                  size={[
                    0.18,
                    0.72,
                    0.18,
                  ]}
                  color="#cbd5e1"
                />
              ))}

              {[
                -4.4,
                -2.7,
                -1,
                0.7,
                2.4,
                4.1,
              ].map(
                (
                  x,
                  carIndex
                ) => (
                  <Carro
                    key={`${andar.id}-car-${x}`}
                    position={[
                      x,
                      y +
                        0.1,
                      0.85,
                    ]}
                    color={
                      carIndex %
                      2
                        ? "#cbd5e1"
                        : "#1e293b"
                    }
                  />
                )
              )}

              <Label
                position={[
                  -7.05,
                  y,
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
                ativo={
                  selecionado
                }
                onClick={() =>
                  onSelect(
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
        Number(
          andar.ordem
        ) === 0
    );

  const estacionamento =
    itensExternos.find(
      itemEhEstacionamento
    );

  return (
    <group>
      <GradeRua
        camada={
          camada
        }
      />

      <EstacionamentoFundos
        camada={
          camada
        }
        item={
          estacionamento
        }
        selecionado={
          itemSelecionado?.id ===
          estacionamento?.id
        }
        onSelect={
          onSelectItem
        }
      />

      <Paisagismo />

      <ItensExternos
        itens={
          itensExternos
        }
        camada={
          camada
        }
        itemSelecionado={
          itemSelecionado
        }
        onSelect={
          onSelectItem
        }
      />

      <Embasamento
        camada={
          camada
        }
        selecionado={
          andarSelecionado?.id ===
          terreo?.id
        }
        selecionarTerreo={() =>
          terreo &&
          onSelectAndar(
            terreo
          )
        }
      />

      <TorreEspelhada
        andares={
          andares
        }
        andarSelecionado={
          andarSelecionado
        }
        onSelect={
          onSelectAndar
        }
        camada={
          camada
        }
      />

      <AreasTecnicasSuperiores
        andares={
          andares
        }
        selecionado={
          andarSelecionado
        }
        onSelect={
          onSelectAndar
        }
        camada={
          camada
        }
      />

      <Subsolos
        andares={
          andares
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
        onSelect={
          onSelectAndar
        }
      />

      <PlanoPosicionamento
        ativo={
          posicionamento.ativo
        }
        lado={
          posicionamento.lado
        }
        onEscolher={
          onEscolherPosicao
        }
      />
    </group>
  );
}

function ModalAndares({
  andares,
  salvando,
  onFechar,
  onSalvar,
  onExcluir,
}) {
  const [
    form,
    setForm,
  ] =
    useState(
      campoAndarVazio()
    );

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Gerenciar andares
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Adicione, edite ou remova pavimentos. Os arquivos associados continuam vinculados ao andar.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onFechar
            }
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            value={
              form.nome
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  nome:
                    event
                      .target
                      .value,
                })
              )
            }
            placeholder="Nome do andar"
            className="rounded-2xl border border-slate-200 p-3 text-sm"
          />

          <input
            value={
              form.tituloCurto
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  tituloCurto:
                    event
                      .target
                      .value,
                })
              )
            }
            placeholder="Título curto do rótulo"
            className="rounded-2xl border border-slate-200 p-3 text-sm"
          />

          <input
            value={
              form.ordem
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  ordem:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              )
            }
            type="number"
            placeholder="Ordem"
            className="rounded-2xl border border-slate-200 p-3 text-sm"
          />

          <input
            value={
              form.altura
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  altura:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              )
            }
            type="number"
            step="0.1"
            placeholder="Altura"
            className="rounded-2xl border border-slate-200 p-3 text-sm"
          />

          <select
            value={
              form.categoria
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  categoria:
                    event
                      .target
                      .value,
                })
              )
            }
            className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
          >
            <option value="subsolo">
              Subsolo
            </option>

            <option value="terreo">
              Térreo
            </option>

            <option value="comercial">
              Comercial
            </option>

            <option value="tecnico">
              Técnico
            </option>

            <option value="cobertura">
              Cobertura
            </option>
          </select>

          <input
            value={
              form.cor
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  cor:
                    event
                      .target
                      .value,
                })
              )
            }
            type="color"
            className="h-[46px] rounded-2xl border border-slate-200 p-2"
          />

          <textarea
            value={
              form.observacao
            }
            onChange={(event) =>
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
            placeholder="Observação"
            className="min-h-[64px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
          />

          <label className="flex items-center gap-2 text-sm font-bold text-slate-600 md:col-span-2">
            <input
              type="checkbox"
              checked={
                form.mostrarRotulo !==
                false
              }
              onChange={(event) =>
                setForm(
                  (
                    valor
                  ) => ({
                    ...valor,
                    mostrarRotulo:
                      event
                        .target
                        .checked,
                  })
                )
              }
            />

            Mostrar rótulo
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              if (
                !form.nome
              ) {
                return;
              }

              await onSalvar(
                form
              );

              setForm(
                campoAndarVazio()
              );
            }}
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
              <Save
                size={17}
              />
            )}

            {form.id
              ? "Atualizar andar"
              : "Adicionar andar"}
          </button>

          {form.id && (
            <button
              type="button"
              onClick={() =>
                setForm(
                  campoAndarVazio()
                )
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 font-black text-slate-700"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="mt-5 divide-y rounded-2xl border border-slate-100">
          {ordenarAndares(
            andares
          )
            .reverse()
            .map(
              (
                andar
              ) => (
                <div
                  key={
                    andar.id
                  }
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...andar,
                      })
                    }
                    className="flex-1 text-left"
                  >
                    <p className="font-black text-slate-900">
                      {
                        andar.nome
                      }
                    </p>

                    <p className="text-xs text-slate-400">
                      Ordem{" "}
                      {
                        andar.ordem
                      }{" "}
                      · categoria{" "}
                      {
                        andar.categoria ||
                        "-"
                      }{" "}
                      · altura{" "}
                      {
                        andar.altura
                      }
                    </p>
                  </button>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...andar,
                        })
                      }
                      className="rounded-xl p-2 text-blue-600 hover:bg-blue-50"
                      title="Editar andar"
                    >
                      <Edit3
                        size={16}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onExcluir(
                          andar
                        )
                      }
                      className="rounded-xl p-2 text-rose-600 hover:bg-rose-50"
                      title="Remover andar"
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

function CadastroLocal({
  andarSelecionado,
  localEditando,
  salvando,
  onSalvar,
  onCancelarEdicao,
}) {
  const [
    form,
    setForm,
  ] =
    useState(
      campoLocalVazio()
    );

  useEffect(() => {
    setForm(
      localEditando
        ? {
            ...localEditando,
          }
        : campoLocalVazio()
    );
  }, [
    localEditando?.id,
    andarSelecionado?.id,
  ]);

  if (
    !andarSelecionado
  ) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="font-black text-slate-900">
        {form.id
          ? "Editar local ou equipamento"
          : "Cadastrar local ou equipamento"}
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
          value={
            form.nome
          }
          onChange={(event) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                nome:
                  event
                    .target
                    .value,
              })
            )
          }
          placeholder="Nome"
          className="rounded-2xl border border-slate-200 p-3 text-sm"
        />

        <select
          value={
            form.tipo
          }
          onChange={(event) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                tipo:
                  event
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
          onChange={(event) =>
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
          onChange={(event) =>
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
          onChange={(event) =>
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
          onChange={(event) =>
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

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await onSalvar(
              form
            );

            setForm(
              campoLocalVazio()
            );
          }}
          disabled={
            salvando ||
            !form.nome
          }
          className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50"
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

          {form.id
            ? "Atualizar"
            : "Salvar"}
        </button>

        {form.id && (
          <button
            type="button"
            onClick={() => {
              setForm(
                campoLocalVazio()
              );

              onCancelarEdicao();
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 font-black text-slate-700"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

function CadastroItemExterno({
  itemSelecionado,
  salvando,
  posicionamento,
  onAtivarPosicionamento,
  onSalvar,
  onExcluir,
  onNovo,
}) {
  const [
    form,
    setForm,
  ] =
    useState(
      campoItemVazio()
    );

  useEffect(() => {
    setForm(
      itemSelecionado
        ? {
            ...itemSelecionado,
          }
        : campoItemVazio()
    );
  }, [
    itemSelecionado?.id,
  ]);

  useEffect(() => {
    if (
      posicionamento.coordenadas
    ) {
      setForm(
        (
          valor
        ) => ({
          ...valor,
          ...posicionamento.coordenadas,
        })
      );
    }
  }, [
    posicionamento.coordenadas,
  ]);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900">
            Item externo personalizado
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Cadastre tampas, caixas, cubículos, postes e equipamentos técnicos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(
              campoItemVazio()
            );

            onNovo();
          }}
          className="rounded-xl p-2 text-blue-600 hover:bg-blue-50"
          title="Novo item externo"
        >
          <Plus
            size={18}
          />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={
            form.nome
          }
          onChange={(event) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                nome:
                  event
                    .target
                    .value,
              })
            )
          }
          placeholder="Nome do item"
          className="rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
        />

        <select
          value={
            form.categoria
          }
          onChange={(event) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                categoria:
                  event
                    .target
                    .value,
              })
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {CATEGORIAS_ITEM.map(
            (
              categoria
            ) => (
              <option
                key={
                  categoria
                }
              >
                {
                  categoria
                }
              </option>
            )
          )}
        </select>

        <select
          value={
            form.status
          }
          onChange={(event) =>
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

        <select
          value={
            form.lado
          }
          onChange={(event) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                lado:
                  event
                    .target
                    .value,
              })
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {LADOS_EXTERNOS.map(
            (
              opcao
            ) => (
              <option
                key={
                  opcao.value
                }
                value={
                  opcao.value
                }
              >
                {
                  opcao.label
                }
              </option>
            )
          )}
        </select>

        <select
          value={
            form.tipoVisual
          }
          onChange={(event) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                tipoVisual:
                  event
                    .target
                    .value,
              })
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
        >
          {TIPOS_VISUAIS.map(
            (
              opcao
            ) => (
              <option
                key={
                  opcao.value
                }
                value={
                  opcao.value
                }
              >
                {
                  opcao.label
                }
              </option>
            )
          )}
        </select>

        <select
          value={
            form.modoImplantacao
          }
          onChange={(event) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                modoImplantacao:
                  event
                    .target
                    .value,
              })
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm md:col-span-2"
        >
          {MODOS_IMPLANTACAO.map(
            (
              opcao
            ) => (
              <option
                key={
                  opcao.value
                }
                value={
                  opcao.value
                }
              >
                {
                  opcao.label
                }
              </option>
            )
          )}
        </select>

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() =>
              onAtivarPosicionamento(
                form.lado
              )
            }
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${
              posicionamento.ativo
                ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            <MousePointer2
              size={17}
            />

            {posicionamento.ativo
              ? "Clique no terreno do mapa"
              : "Escolher local no mapa"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          {[
            [
              "x",
              "X",
            ],
            [
              "y",
              "Y",
            ],
            [
              "z",
              "Z",
            ],
          ].map(
            ([
              campo,
              rotulo,
            ]) => (
              <label
                key={
                  campo
                }
                className="text-xs font-bold text-slate-500"
              >
                {
                  rotulo
                }

                <input
                  value={
                    form[
                      campo
                    ]
                  }
                  onChange={(event) =>
                    setForm(
                      (
                        valor
                      ) => ({
                        ...valor,
                        [campo]:
                          Number(
                            event
                              .target
                              .value
                          ),
                      })
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

        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          {[
            [
              "largura",
              "Largura",
            ],
            [
              "altura",
              "Altura",
            ],
            [
              "profundidade",
              "Profund.",
            ],
          ].map(
            ([
              campo,
              rotulo,
            ]) => (
              <label
                key={
                  campo
                }
                className="text-xs font-bold text-slate-500"
              >
                {
                  rotulo
                }

                <input
                  value={
                    form[
                      campo
                    ]
                  }
                  onChange={(event) =>
                    setForm(
                      (
                        valor
                      ) => ({
                        ...valor,
                        [campo]:
                          Number(
                            event
                              .target
                              .value
                          ),
                      })
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

        <label className="text-xs font-bold text-slate-500">
          Cor

          <input
            value={
              form.cor
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  cor:
                    event
                      .target
                      .value,
                })
              )
            }
            type="color"
            className="mt-1 h-[42px] w-full rounded-xl border border-slate-200 p-2"
          />
        </label>

        <label className="text-xs font-bold text-slate-500">
          Ordem

          <input
            value={
              form.ordem
            }
            onChange={(event) =>
              setForm(
                (
                  valor
                ) => ({
                  ...valor,
                  ordem:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              )
            }
            type="number"
            className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm"
          />
        </label>

        <textarea
          value={
            form.descricao
          }
          onChange={(event) =>
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
          className="min-h-[70px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
        />

        <textarea
          value={
            form.observacao
          }
          onChange={(event) =>
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
          placeholder="Observação"
          className="min-h-[58px] rounded-2xl border border-slate-200 p-3 text-sm md:col-span-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onSalvar(
              form
            )
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
            <Save
              size={17}
            />
          )}

          {form.id
            ? "Atualizar item"
            : "Adicionar item"}
        </button>

        {form.id && (
          <button
            type="button"
            onClick={() =>
              onExcluir(
                form
              )
            }
            className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 font-black text-rose-700"
          >
            <Trash2
              size={17}
            />

            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function ArquivosEntidade({
  entidade,
  arquivos,
  salvando,
  onUpload,
  onExcluir,
}) {
  const cameraInput =
    useRef(null);

  const fotoInput =
    useRef(null);

  const plantaInput =
    useRef(null);

  if (
    !entidade
  ) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-400">
        Arquivos associados
      </p>

      <h3 className="mt-1 font-black text-slate-900">
        {
          entidade
            .dados
            .nome
        }
      </h3>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() =>
            cameraInput
              .current
              ?.click()
          }
          className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <Camera
            size={17}
          />

          Abrir câmera
        </button>

        <button
          type="button"
          onClick={() =>
            fotoInput
              .current
              ?.click()
          }
          className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <ImagePlus
            size={17}
          />

          Adicionar foto
        </button>

        <button
          type="button"
          onClick={() =>
            plantaInput
              .current
              ?.click()
          }
          className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <FileText
            size={17}
          />

          Adicionar planta ou PDF
        </button>

        <input
          ref={
            cameraInput
          }
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) =>
            onUpload(
              event
                .target
                .files?.[0],
              "foto"
            )
          }
        />

        <input
          ref={
            fotoInput
          }
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) =>
            onUpload(
              event
                .target
                .files?.[0],
              "foto"
            )
          }
        />

        <input
          ref={
            plantaInput
          }
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={(event) =>
            onUpload(
              event
                .target
                .files?.[0],
              "planta"
            )
          }
        />
      </div>

      {salvando && (
        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-700">
          <Loader2
            size={15}
            className="animate-spin"
          />

          Enviando arquivo...
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {arquivos.map(
          (
            arquivo
          ) => (
            <div
              key={
                arquivo.id
              }
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
            >
              {arquivo.tipoArquivo ===
              "foto" ? (
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
                    src={
                      arquivo.urlPublica
                    }
                    alt={
                      arquivo.nome
                    }
                    className="h-24 w-full object-cover"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      arquivo.urlPublica,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="flex h-24 w-full flex-col items-center justify-center gap-1 p-2 text-center"
                >
                  <FileText
                    size={22}
                    className="text-rose-500"
                  />

                  <span className="line-clamp-2 text-[10px] font-bold text-slate-700">
                    {
                      arquivo.nome
                    }
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onExcluir(
                    arquivo
                  )
                }
                className="absolute right-1 top-1 rounded-lg bg-slate-950/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                title="Excluir arquivo"
              >
                <Trash2
                  size={12}
                />
              </button>
            </div>
          )
        )}
      </div>

      {arquivos.length ===
        0 && (
        <p className="mt-4 text-sm text-slate-400">
          Nenhum arquivo associado ainda.
        </p>
      )}
    </div>
  );
}

function PainelDetalhes({
  entidade,
  andarSelecionado,
  itemSelecionado,
  locaisSelecionados,
  onFechar,
  onEditarLocal,
  onExcluirLocal,
  onSelecionarLocal,
}) {
  if (
    !entidade
  ) {
    return (
      <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">
          Selecione um pavimento ou item externo no mapa.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">
            {entidade.tipo ===
            "andar"
              ? "Andar selecionado"
              : entidade.tipo ===
                "item_externo"
              ? "Item externo selecionado"
              : "Local selecionado"}
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-900">
            {
              entidade
                .dados
                .nome
            }
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {entidade
              .dados
              .descricao ||
              entidade
                .dados
                .observacao ||
              "Sem observações cadastradas."}
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

      {itemSelecionado && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-3 text-xs">
          <div>
            <p className="text-slate-400">
              Lado
            </p>

            <p className="font-black text-slate-800">
              {
                itemSelecionado.lado
              }
            </p>
          </div>

          <div>
            <p className="text-slate-400">
              Implantação
            </p>

            <p className="font-black text-slate-800">
              {
                itemSelecionado.modoImplantacao
              }
            </p>
          </div>

          <div>
            <p className="text-slate-400">
              Formato
            </p>

            <p className="font-black text-slate-800">
              {
                itemSelecionado.tipoVisual
              }
            </p>
          </div>

          <div>
            <p className="text-slate-400">
              Status
            </p>

            <p className="font-black text-slate-800">
              {
                itemSelecionado.status
              }
            </p>
          </div>
        </div>
      )}

      {andarSelecionado && (
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
                    <button
                      type="button"
                      onClick={() =>
                        onSelecionarLocal(
                          local
                        )
                      }
                      className="flex-1 text-left"
                    >
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
                    </button>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onEditarLocal(
                            local
                          )
                        }
                        className="rounded-xl p-2 text-blue-600 hover:bg-blue-50"
                        title="Editar"
                      >
                        <Edit3
                          size={15}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onExcluirLocal(
                            local
                          )
                        }
                        className="rounded-xl p-2 text-rose-600 hover:bg-rose-50"
                        title="Excluir"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Mapa3D() {
  const [
    andares,
    setAndares,
  ] =
    useState([]);

  const [
    locais,
    setLocais,
  ] =
    useState([]);

  const [
    itensExternos,
    setItensExternos,
  ] =
    useState([]);

  const [
    arquivos,
    setArquivos,
  ] =
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
    localSelecionado,
    setLocalSelecionado,
  ] =
    useState(null);

  const [
    localEditando,
    setLocalEditando,
  ] =
    useState(null);

  const [
    entidadeSelecionada,
    setEntidadeSelecionada,
  ] =
    useState(null);

  const [
    camada,
    setCamada,
  ] =
    useState("geral");

  const [
    painelAberto,
    setPainelAberto,
  ] =
    useState(true);

  const [
    menuCamadasAberto,
    setMenuCamadasAberto,
  ] =
    useState(true);

  const [
    modalAndaresAberto,
    setModalAndaresAberto,
  ] =
    useState(false);

  const [
    cadastroExternoAberto,
    setCadastroExternoAberto,
  ] =
    useState(false);

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

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
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
      [
        andares,
      ]
    );

  const itensOrdenados =
    useMemo(
      () =>
        ordenarItens(
          itensExternos
        ),
      [
        itensExternos,
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

  async function carregarArquivos(
    entidade
  ) {
    if (
      !entidade?.dados?.id
    ) {
      setArquivos([]);

      return;
    }

    try {
      const lista =
        await listarArquivosMapa3DPorEntidade(
          entidade.tipo,
          entidade
            .dados
            .id
        );

      setArquivos(
        lista
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível carregar os arquivos associados."
      );
    }
  }

  async function carregar() {
    setCarregando(
      true
    );

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

      setAndares(
        listaAndares
      );

      setLocais(
        listaLocais
      );

      setItensExternos(
        listaItens
      );

      if (
        !entidadeSelecionada &&
        listaAndares.length
      ) {
        const terreo =
          listaAndares.find(
            (
              andar
            ) =>
              Number(
                andar.ordem
              ) === 0
          ) ||
          listaAndares[0];

        await selecionarAndar(
          terreo
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
          await criarAndarMapa3D(
            andar
          );
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

  async function selecionarAndar(
    andar
  ) {
    const entidade = {
      tipo: "andar",
      dados: andar,
    };

    setAndarSelecionado(
      andar
    );

    setItemSelecionado(
      null
    );

    setLocalSelecionado(
      null
    );

    setLocalEditando(
      null
    );

    setEntidadeSelecionada(
      entidade
    );

    setCadastroExternoAberto(
      false
    );

    setPainelAberto(
      true
    );

    setPosicionamento({
      ativo: false,
      lado: "frente",
      coordenadas: null,
    });

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

    setItemSelecionado(
      item
    );

    setAndarSelecionado(
      null
    );

    setLocalSelecionado(
      null
    );

    setLocalEditando(
      null
    );

    setEntidadeSelecionada(
      entidade
    );

    setCadastroExternoAberto(
      true
    );

    setPainelAberto(
      true
    );

    setPosicionamento({
      ativo: false,
      lado:
        item.lado ||
        "frente",
      coordenadas: null,
    });

    await carregarArquivos(
      entidade
    );
  }

  async function selecionarLocal(
    local
  ) {
    const entidade = {
      tipo: "local",
      dados: local,
    };

    setLocalSelecionado(
      local
    );

    setEntidadeSelecionada(
      entidade
    );

    setPainelAberto(
      true
    );

    await carregarArquivos(
      entidade
    );
  }

  async function salvarAndar(
    form
  ) {
    setSalvando(
      true
    );

    setErro("");

    try {
      if (
        form.id
      ) {
        const atualizado =
          await atualizarAndarMapa3D(
            form.id,
            form
          );

        setAndares(
          (
            anteriores
          ) =>
            anteriores.map(
              (
                andar
              ) =>
                andar.id ===
                atualizado.id
                  ? atualizado
                  : andar
            )
        );

        if (
          andarSelecionado?.id ===
          atualizado.id
        ) {
          await selecionarAndar(
            atualizado
          );
        }
      } else {
        const criado =
          await criarAndarMapa3D(
            form
          );

        setAndares(
          (
            anteriores
          ) =>
            ordenarAndares([
              ...anteriores,
              criado,
            ])
        );
      }
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível salvar o andar."
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function excluirAndar(
    andar
  ) {
    if (
      !window.confirm(
        `Remover "${andar.nome}"? Os locais vinculados também serão removidos.`
      )
    ) {
      return;
    }

    try {
      await excluirAndarMapa3D(
        andar.id
      );

      setAndares(
        (
          anteriores
        ) =>
          anteriores.filter(
            (
              item
            ) =>
              item.id !==
              andar.id
          )
      );

      if (
        andarSelecionado?.id ===
        andar.id
      ) {
        setAndarSelecionado(
          null
        );

        setEntidadeSelecionada(
          null
        );

        setArquivos([]);
      }
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível remover o andar."
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
      if (
        form.id
      ) {
        const atualizado =
          await atualizarLocalMapa3D(
            form.id,
            {
              ...form,
              andarId:
                andarSelecionado.id,
            }
          );

        setLocais(
          (
            anteriores
          ) =>
            anteriores.map(
              (
                local
              ) =>
                local.id ===
                atualizado.id
                  ? atualizado
                  : local
            )
        );

        setLocalEditando(
          null
        );
      } else {
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
      }
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
    if (
      !window.confirm(
        `Excluir "${local.nome}"?`
      )
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

      if (
        localSelecionado?.id ===
        local.id
      ) {
        await selecionarAndar(
          andarSelecionado
        );
      }
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

  async function salvarItemExterno(
    form
  ) {
    setSalvando(
      true
    );

    setErro("");

    try {
      if (
        form.id
      ) {
        const atualizado =
          await atualizarItemExternoMapa3D(
            form.id,
            form
          );

        setItensExternos(
          (
            anteriores
          ) =>
            anteriores.map(
              (
                item
              ) =>
                item.id ===
                atualizado.id
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

        setItensExternos(
          (
            anteriores
          ) =>
            ordenarItens([
              ...anteriores,
              criado,
            ])
        );

        await selecionarItem(
          criado
        );
      }
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível salvar o item externo."
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function excluirItemExterno(
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

      setItensExternos(
        (
          anteriores
        ) =>
          anteriores.filter(
            (
              atual
            ) =>
              atual.id !==
              item.id
          )
      );

      if (
        itemSelecionado?.id ===
        item.id
      ) {
        setItemSelecionado(
          null
        );

        setEntidadeSelecionada(
          null
        );

        setArquivos([]);
      }
    } catch (
      error
    ) {
      console.error(
        error
      );

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

    setSalvando(
      true
    );

    setErro("");

    try {
      const criado =
        await criarArquivoMapa3D({
          entidadeTipo:
            entidadeSelecionada.tipo,
          entidadeId:
            entidadeSelecionada
              .dados
              .id,
          tipoArquivo,
          arquivo,
        });

      setArquivos(
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
        "Não foi possível enviar o arquivo. Confira o bucket mapa3d-arquivos no Supabase Storage."
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function excluirArquivo(
    arquivo
  ) {
    if (
      !window.confirm(
        `Excluir "${arquivo.nome}"?`
      )
    ) {
      return;
    }

    try {
      await excluirArquivoMapa3D(
        arquivo.id,
        arquivo.caminhoStorage
      );

      setArquivos(
        (
          anteriores
        ) =>
          anteriores.filter(
            (
              item
            ) =>
              item.id !==
              arquivo.id
          )
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível excluir o arquivo."
      );
    }
  }

  function ativarPosicionamento(
    lado
  ) {
    setPosicionamento({
      ativo: true,
      lado,
      coordenadas: null,
    });
  }

  function escolherPosicao(
    coordenadas
  ) {
    setPosicionamento(
      (
        valor
      ) => ({
        ...valor,
        ativo: false,
        coordenadas,
      })
    );
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
                  Torre espelhada, áreas externas editáveis, três fontes, paisagismo e cinco subsolos abaixo do nível da rua.
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
                    setModalAndaresAberto(
                      true
                    )
                  }
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700"
                >
                  <Layers3
                    size={16}
                  />

                  Gerenciar andares
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCadastroExternoAberto(
                      true
                    );

                    setPainelAberto(
                      true
                    );

                    setItemSelecionado(
                      null
                    );

                    setAndarSelecionado(
                      null
                    );

                    setLocalSelecionado(
                      null
                    );

                    setEntidadeSelecionada(
                      null
                    );

                    setPosicionamento({
                      ativo: false,
                      lado: "frente",
                      coordenadas: null,
                    });
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700"
                >
                  <Plus
                    size={16}
                  />

                  Item externo
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

            <div className="grid min-h-[920px] grid-cols-1 xl:grid-cols-[220px_190px_1fr]">
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
                        Externos
                      </p>

                      <p className="font-black text-slate-900">
                        {
                          itensExternos.length
                        }
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

                <div className="mt-5">
                  <p className="px-2 text-xs font-black uppercase text-slate-400">
                    Itens externos
                  </p>

                  <div className="mt-2 max-h-[330px] space-y-1 overflow-auto">
                    {itensOrdenados.map(
                      (
                        item
                      ) => (
                        <button
                          type="button"
                          key={
                            item.id
                          }
                          onClick={() =>
                            selecionarItem(
                              item
                            )
                          }
                          className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-bold ${
                            itemSelecionado?.id ===
                            item.id
                              ? "bg-cyan-100 text-cyan-950"
                              : "hover:bg-white"
                          }`}
                        >
                          <MapPin
                            size={13}
                          />

                          <span className="truncate">
                            {
                              item.nome
                            }
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </aside>

              <aside className="border-r border-slate-100 bg-white p-3">
                <p className="px-2 text-xs font-black uppercase text-slate-400">
                  Pavimentos
                </p>

                <div className="mt-2 max-h-[875px] space-y-1 overflow-auto">
                  {andaresOrdenados
                    .slice()
                    .reverse()
                    .map(
                      (
                        andar
                      ) => (
                        <button
                          type="button"
                          key={
                            andar.id
                          }
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
                            {
                              andar.nome
                            }
                          </span>

                          <span className="text-slate-400">
                            {
                              andar.ordem
                            }
                          </span>
                        </button>
                      )
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
                    itensExternos={
                      itensOrdenados
                    }
                    camada={
                      camada
                    }
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
                    onEscolherPosicao={
                      escolherPosicao
                    }
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
                      -4.8,
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
                    enableRotate={
                      !posicionamento.ativo
                    }
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
                entidade={
                  entidadeSelecionada
                }
                andarSelecionado={
                  andarSelecionado
                }
                itemSelecionado={
                  itemSelecionado
                }
                locaisSelecionados={
                  locaisSelecionados
                }
                onFechar={() =>
                  setPainelAberto(
                    false
                  )
                }
                onEditarLocal={
                  setLocalEditando
                }
                onExcluirLocal={
                  excluirLocal
                }
                onSelecionarLocal={
                  selecionarLocal
                }
              />

              <ArquivosEntidade
                entidade={
                  entidadeSelecionada
                }
                arquivos={
                  arquivos
                }
                salvando={
                  salvando
                }
                onUpload={
                  enviarArquivo
                }
                onExcluir={
                  excluirArquivo
                }
              />

              {cadastroExternoAberto ? (
                <CadastroItemExterno
                  itemSelecionado={
                    itemSelecionado
                  }
                  salvando={
                    salvando
                  }
                  posicionamento={
                    posicionamento
                  }
                  onAtivarPosicionamento={
                    ativarPosicionamento
                  }
                  onSalvar={
                    salvarItemExterno
                  }
                  onExcluir={
                    excluirItemExterno
                  }
                  onNovo={() => {
                    setItemSelecionado(
                      null
                    );

                    setEntidadeSelecionada(
                      null
                    );

                    setArquivos([]);

                    setPosicionamento({
                      ativo: false,
                      lado: "frente",
                      coordenadas: null,
                    });
                  }}
                />
              ) : (
                <CadastroLocal
                  andarSelecionado={
                    andarSelecionado
                  }
                  localEditando={
                    localEditando
                  }
                  salvando={
                    salvando
                  }
                  onSalvar={
                    salvarLocal
                  }
                  onCancelarEdicao={() =>
                    setLocalEditando(
                      null
                    )
                  }
                />
              )}
            </section>
          )}
        </div>
      )}

      {modalAndaresAberto && (
        <ModalAndares
          andares={
            andares
          }
          salvando={
            salvando
          }
          onFechar={() =>
            setModalAndaresAberto(
              false
            )
          }
          onSalvar={
            salvarAndar
          }
          onExcluir={
            excluirAndar
          }
        />
      )}
    </div>
  );
}
