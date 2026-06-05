import {
  AlertTriangle,
  Building2,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  ImagePlus,
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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  atualizarItemExternoMapa3D,
  criarArquivoMapa3D,
  criarItemExternoMapa3D,
  excluirArquivoProtegidoMapa3D,
  excluirItemExternoMapa3D,
  listarAndaresMapa3D,
  listarArquivosMapa3DPorEntidade,
  listarItensExternosMapa3D,
  listarLocaisMapa3D,
} from "../services/mapa3dSupabaseService";

/**
 * MAPA 3D JK 1455 — V11
 *
 * Estrutura visual:
 * - térreo em pedra;
 * - 1º e 2º pavimentos técnicos em pedra;
 * - fachada espelhada somente do 3º andar em diante;
 * - ausência intencional do 13º andar;
 * - último pavimento comercial Ferrero em vidro com pilastras;
 * - três áreas técnicas superiores em pedra;
 * - heliponto separado;
 * - cinco subsolos visíveis;
 * - painéis laterais minimizáveis;
 * - layout adaptado para celular;
 * - exclusão de fotos e plantas protegida por senha.
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

function itemEhEstacionamento(
  item
) {
  return (
    item?.nome
      ?.trim()
      .toLowerCase() ===
    "estacionamento externo"
  );
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
        transparent={
          opacity < 1
        }
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
      zIndexRange={[
        100,
        0,
      ]}
    >
      <button
        type="button"
        onClick={onClick}
        className={`min-w-[118px] rounded-2xl border px-3 py-2 text-left shadow-lg backdrop-blur transition ${
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
        position={[
          0,
          -0.18,
          0,
        ]}
        size={[
          18,
          0.3,
          16,
        ]}
        color="#cbd5e1"
        roughness={0.9}
      />

      <Box
        position={[
          0,
          0.005,
          0,
        ]}
        size={[
          17.65,
          0.06,
          15.65,
        ]}
        color="#dce6ed"
        roughness={0.92}
      />

      <Box
        position={[
          0,
          0.01,
          7.1,
        ]}
        size={[
          18,
          0.08,
          1.5,
        ]}
        color="#475569"
        roughness={0.96}
      />

      <Box
        position={[
          6.05,
          0.05,
          -0.25,
        ]}
        size={[
          2.2,
          0.07,
          11,
        ]}
        color={
          destacar
            ? "#64748b"
            : "#7c8796"
        }
        roughness={0.95}
      />

      <Box
        position={[
          3.65,
          0.055,
          -5.4,
        ]}
        size={[
          7.2,
          0.075,
          3.6,
        ]}
        color={
          destacar
            ? "#64748b"
            : "#7c8796"
        }
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
        position={[
          0,
          0.15,
          0,
        ]}
        size={[
          0.56,
          0.2,
          1.02,
        ]}
        color={color}
        roughness={0.38}
        metalness={0.42}
      />

      <Box
        position={[
          0,
          0.31,
          -0.03,
        ]}
        size={[
          0.44,
          0.16,
          0.58,
        ]}
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
    <group
      position={[
        x,
        0.11,
        z,
      ]}
    >
      <Box
        position={[
          0,
          0,
          0,
        ]}
        size={[
          0.05,
          0.035,
          1.15,
        ]}
        color="#f8fafc"
      />

      <Box
        position={[
          0.82,
          0,
          0,
        ]}
        size={[
          0.05,
          0.035,
          1.15,
        ]}
        color="#f8fafc"
      />

      {ocupada && (
        <Carro
          position={[
            0.4,
            0.02,
            0,
          ]}
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
            key={`vaga-a-${index}`}
            x={
              1.1 +
              index *
                0.83
            }
            z={-6.08}
            ocupada={
              index %
                3 ===
              0
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
            key={`vaga-b-${index}`}
            x={
              1.1 +
              index *
                0.83
            }
            z={-4.82}
            ocupada={
              index %
                4 ===
              1
            }
          />
        )
      )}

      <Label
        position={[
          4.8,
          0.55,
          -6.9,
        ]}
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
        position={[
          0,
          0.04,
          0,
        ]}
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
        position={[
          0,
          0.14,
          0,
        ]}
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
        position={[
          0,
          0.45,
          0,
        ]}
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
        position={[
          0,
          0.26,
          0,
        ]}
        size={[
          0.1,
          0.52,
          0.1,
        ]}
        color="#7c5a3c"
      />

      <mesh
        position={[
          0,
          0.72,
          0,
        ]}
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
        position={[
          -2.85,
          0.14,
          4.95,
        ]}
        escala={0.78}
      />

      <Fonte
        position={[
          0,
          0.14,
          5.12,
        ]}
        escala={0.9}
      />

      <Fonte
        position={[
          2.85,
          0.14,
          4.95,
        ]}
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
      ].map(
        (x) => (
          <Arvore
            key={`arvore-${x}`}
            position={[
              x,
              0.12,
              5.3,
            ]}
            escala={0.76}
          />
        )
      )}
    </group>
  );
}

function posicaoItem(
  item
) {
  const x =
    Number(
      item.x ||
        0
    );

  const y =
    Number(
      item.y ||
        0
    );

  const z =
    Number(
      item.z ||
        0
    );

  if (
    item.lado ===
    "fundos"
  ) {
    return [
      x,
      y,
      -4.6 + z,
    ];
  }

  if (
    item.lado ===
    "esquerda"
  ) {
    return [
      -5.7 + x,
      y,
      z,
    ];
  }

  if (
    item.lado ===
    "direita"
  ) {
    return [
      7.1 + x,
      y,
      z,
    ];
  }

  if (
    item.lado ===
    "centro"
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
      ponto.x.toFixed(
        2
      )
    );

  const y =
    0.1;

  const z =
    Number(
      ponto.z.toFixed(
        2
      )
    );

  if (
    lado ===
    "fundos"
  ) {
    return {
      x,
      y,
      z: Number(
        (
          z +
          4.6
        ).toFixed(
          2
        )
      ),
    };
  }

  if (
    lado ===
    "esquerda"
  ) {
    return {
      x: Number(
        (
          x +
          5.7
        ).toFixed(
          2
        )
      ),
      y,
      z,
    };
  }

  if (
    lado ===
    "direita"
  ) {
    return {
      x: Number(
        (
          x -
          7.1
        ).toFixed(
          2
        )
      ),
      y,
      z,
    };
  }

  return {
    x,
    y,
    z,
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
        item.largura ||
          0.8
      )
    );

  const altura =
    Math.max(
      0.12,
      Number(
        item.altura ||
          0.6
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
      ? -0.04
      : yBase +
        altura /
          2;

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
          onClick={
            clicar
          }
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              largura /
                2,
              largura /
                2,
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
            roughness={
              0.68
            }
          />
        </mesh>
      ) : item.tipoVisual ===
        "poste" ? (
        <mesh
          onClick={
            clicar
          }
          position={[
            0,
            altura /
              2,
            0,
          ]}
          castShadow
        >
          <cylinderGeometry
            args={[
              Math.max(
                0.05,
                largura /
                  7
              ),
              Math.max(
                0.05,
                largura /
                  7
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
      ) : (
        <Box
          position={[
            0,
            0,
            0,
          ]}
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
          roughness={
            0.74
          }
          onClick={
            clicar
          }
        />
      )}

      <Label
        position={[
          0,
          subterraneo
            ? 0.42
            : altura /
                2 +
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
      ).map(
        (item) => (
          <ItemExternoVisual
            key={
              item.id
            }
            item={
              item
            }
            selecionado={
              itemSelecionado?.id ===
              item.id
            }
            onSelect={
              onSelect
            }
          />
        )
      )}
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
    <mesh
      position={[
        0,
        0.13,
        0,
      ]}
      rotation={[
        -Math.PI /
          2,
        0,
        0,
      ]}
      onClick={(
        event
      ) => {
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
        opacity={
          0.18
        }
      />
    </mesh>
  );
}

function Embasamento({
  camada,
  selecionado,
  selecionarTerreo,
}) {
  if (
    camada ===
    "subsolos"
  ) {
    return null;
  }

  return (
    <group>
      <Box
        position={[
          0,
          0.775,
          0,
        ]}
        size={[
          9.4,
          1.55,
          7.7,
        ]}
        color={
          selecionado
            ? "#67e8f9"
            : "#ded3bd"
        }
        roughness={
          0.72
        }
        onClick={(
          event
        ) => {
          event.stopPropagation();

          selecionarTerreo();
        }}
      />

      <Linha
        position={[
          0,
          0.22,
          0,
        ]}
        size={[
          9.7,
          0.14,
          7.92,
        ]}
      />

      <Linha
        position={[
          0,
          1.42,
          0,
        ]}
        size={[
          9.75,
          0.14,
          7.95,
        ]}
      />

      <Box
        position={[
          0,
          0.7,
          4.12,
        ]}
        size={[
          2.6,
          1.25,
          0.68,
        ]}
        color="#d8ccb6"
      />

      <Box
        position={[
          0,
          0.72,
          4.48,
        ]}
        size={[
          1.35,
          0.9,
          0.08,
        ]}
        color="#17353c"
      />

      <Label
        position={[
          -4.6,
          1.65,
          4.4,
        ]}
        titulo="Térreo"
        subtitulo="Acesso principal"
        ativo={
          selecionado
        }
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
    camada ===
    "subsolos"
  ) {
    return null;
  }

  const largura =
    8.7;

  const profundidade =
    7.1;

  const baseY =
    1.65;

  const alturaTecnicoBase =
    0.82;

  const espacamentoTecnico =
    0.9;

  const tecnicosBase =
    andares.filter(
      (andar) =>
        Number(
          andar.ordem
        ) >=
          1 &&
        Number(
          andar.ordem
        ) <=
          2
    );

  const baseVidroY =
    baseY +
    tecnicosBase.length *
      espacamentoTecnico +
    0.08;

  const alturaVidro =
    8.15;

  const topoVidroY =
    baseVidroY +
    alturaVidro;

  const pavimentosCorporativos =
    andares.filter(
      (andar) =>
        Number(
          andar.ordem
        ) >=
          3 &&
        Number(
          andar.ordem
        ) <=
          15 &&
        Number(
          andar.ordem
        ) !==
          13
    );

  const ferrero =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) ===
        16
    );

  const alturaPiso =
    alturaVidro /
    Math.max(
      1,
      pavimentosCorporativos.length
    );

  const ferreroY =
    topoVidroY +
    0.68;

  const alturaFerrero =
    0.98;

  const larguraFerrero =
    9.08;

  const profundidadeFerrero =
    7.48;

  function clicarAndar(
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
      {tecnicosBase.map(
        (
          andar,
          index
        ) => {
          const y =
            baseY +
            index *
              espacamentoTecnico +
            alturaTecnicoBase /
              2;

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
                    0.45,
                  alturaTecnicoBase,
                  profundidade +
                    0.42,
                ]}
                color={
                  selecionado
                    ? "#eee4d5"
                    : "#d8ccb6"
                }
                roughness={
                  0.86
                }
                onClick={
                  clicarAndar(
                    andar
                  )
                }
              />

              <Linha
                position={[
                  0,
                  y -
                    alturaTecnicoBase /
                      2 -
                    0.055,
                  0,
                ]}
                size={[
                  largura +
                    0.78,
                  0.11,
                  profundidade +
                    0.7,
                ]}
                color="#c6b79f"
              />

              <Linha
                position={[
                  0,
                  y +
                    alturaTecnicoBase /
                      2 +
                    0.055,
                  0,
                ]}
                size={[
                  largura +
                    0.78,
                  0.11,
                  profundidade +
                    0.7,
                ]}
                color="#c6b79f"
              />

              {[
                -3.6,
                -2.4,
                -1.2,
                0,
                1.2,
                2.4,
                3.6,
              ].map(
                (
                  x
                ) => (
                  <Box
                    key={`${andar.id}-junta-${x}`}
                    position={[
                      x,
                      y,
                      profundidade /
                        2 +
                        0.24,
                    ]}
                    size={[
                      0.03,
                      0.5,
                      0.03,
                    ]}
                    color="#b9aa92"
                    roughness={
                      0.9
                    }
                    onClick={
                      clicarAndar(
                        andar
                      )
                    }
                  />
                )
              )}

              {selecionado && (
                <Label
                  position={[
                    5.85,
                    y,
                    0.4,
                  ]}
                  titulo={
                    andar.nome
                  }
                  subtitulo="Pavimento técnico em pedra"
                  ativo
                  onClick={() =>
                    onSelect(
                      andar
                    )
                  }
                />
              )}
            </group>
          );
        }
      )}

      <Linha
        position={[
          0,
          baseVidroY -
            0.1,
          0,
        ]}
        size={[
          largura +
            0.9,
          0.16,
          profundidade +
            0.82,
        ]}
        color="#c8baa2"
      />

      <GlassBox
        position={[
          0,
          baseVidroY +
            alturaVidro /
              2,
          0,
        ]}
        size={[
          largura,
          alturaVidro,
          profundidade,
        ]}
        color="#0f4f62"
      />

      {Array.from(
        {
          length: 14,
        },
        (
          _,
          index
        ) => {
          const x =
            -largura /
              2 +
            (
              index *
              largura
            ) /
              13;

          return (
            <Linha
              key={`torre-frente-${index}`}
              position={[
                x,
                baseVidroY +
                  alturaVidro /
                    2,
                profundidade /
                  2 +
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
        (
          _,
          index
        ) => {
          const z =
            -profundidade /
              2 +
            (
              index *
              profundidade
            ) /
              9;

          return (
            <Linha
              key={`torre-lateral-${index}`}
              position={[
                largura /
                  2 +
                  0.012,
                baseVidroY +
                  alturaVidro /
                    2,
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

      {pavimentosCorporativos.map(
        (
          andar,
          index
        ) => {
          const y =
            baseVidroY +
            index *
              alturaPiso +
            alturaPiso /
              2;

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
                onClick={
                  clicarAndar(
                    andar
                  )
                }
              />

              <Linha
                position={[
                  0,
                  baseVidroY +
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

      <Linha
        position={[
          0,
          topoVidroY +
            0.08,
          0,
        ]}
        size={[
          largura +
            0.7,
          0.18,
          profundidade +
            0.66,
        ]}
        color="#c8baa2"
      />

      <GlassBox
        position={[
          0,
          ferreroY,
          0,
        ]}
        size={[
          larguraFerrero,
          alturaFerrero,
          profundidadeFerrero,
        ]}
        color="#176378"
      />

      {ferrero && (
        <Box
          position={[
            0,
            ferreroY,
            0,
          ]}
          size={[
            larguraFerrero +
              0.04,
            alturaFerrero +
              0.04,
            profundidadeFerrero +
              0.04,
          ]}
          color={
            andarSelecionado?.id ===
            ferrero.id
              ? "#22d3ee"
              : "#176378"
          }
          opacity={
            andarSelecionado?.id ===
            ferrero.id
              ? 0.42
              : 0.025
          }
          roughness={
            0.12
          }
          metalness={
            0.65
          }
          onClick={
            clicarAndar(
              ferrero
            )
          }
        />
      )}

      {Array.from(
        {
          length: 11,
        },
        (
          _,
          index
        ) => (
          <Box
            key={`ferrero-frente-${index}`}
            position={[
              -4.15 +
                index *
                  0.83,
              ferreroY,
              profundidadeFerrero /
                2 +
                0.065,
            ]}
            size={[
              0.14,
              alturaFerrero +
                0.08,
              0.15,
            ]}
            color="#d8ccb6"
            roughness={
              0.8
            }
            onClick={
              clicarAndar(
                ferrero
              )
            }
          />
        )
      )}

      {Array.from(
        {
          length: 8,
        },
        (
          _,
          index
        ) => (
          <Box
            key={`ferrero-lateral-${index}`}
            position={[
              larguraFerrero /
                2 +
                0.065,
              ferreroY,
              -3.12 +
                index *
                  0.89,
            ]}
            size={[
              0.15,
              alturaFerrero +
                0.08,
              0.14,
            ]}
            color="#d8ccb6"
            roughness={
              0.8
            }
            onClick={
              clicarAndar(
                ferrero
              )
            }
          />
        )
      )}

      <Linha
        position={[
          0,
          ferreroY -
            alturaFerrero /
              2 -
            0.08,
          0,
        ]}
        size={[
          larguraFerrero +
            0.55,
          0.16,
          profundidadeFerrero +
            0.55,
        ]}
        color="#c8baa2"
      />

      <Linha
        position={[
          0,
          ferreroY +
            alturaFerrero /
              2 +
            0.08,
          0,
        ]}
        size={[
          larguraFerrero +
            0.72,
          0.18,
          profundidadeFerrero +
            0.7,
        ]}
        color="#c8baa2"
      />

      {ferrero &&
        andarSelecionado?.id ===
          ferrero.id && (
          <Label
            position={[
              5.95,
              ferreroY,
              0.5,
            ]}
            titulo="16º Andar — Ferrero"
            subtitulo="Último pavimento comercial"
            ativo
            onClick={() =>
              onSelect(
                ferrero
              )
            }
          />
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
    camada ===
    "subsolos"
  ) {
    return null;
  }

  const torres =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) ===
        17
    );

  const poco =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) ===
        18
    );

  const casa =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) ===
        19
    );

  const heliponto =
    andares.find(
      (andar) =>
        Number(
          andar.ordem
        ) ===
        20
    );

  const baseY =
    13.12;

  const alturaNivel =
    0.7;

  const distanciaNivel =
    0.79;

  const largura =
    9.52;

  const profundidade =
    7.94;

  const niveis = [
    {
      andar:
        torres,
      y:
        baseY,
      nome:
        "Torres de resfriamento",
    },
    {
      andar:
        poco,
      y:
        baseY +
        distanciaNivel,
      nome:
        "Poço dos elevadores",
    },
    {
      andar:
        casa,
      y:
        baseY +
        distanciaNivel *
          2,
      nome:
        "Casa de máquinas",
    },
  ].filter(
    (
      nivel
    ) =>
      Boolean(
        nivel.andar
      )
  );

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

  const topoHeliponto =
    baseY +
    distanciaNivel *
      3 +
    0.25;

  return (
    <group>
      <Linha
        position={[
          0,
          baseY -
            0.5,
          0,
        ]}
        size={[
          10.18,
          0.2,
          8.5,
        ]}
        color="#c3b298"
      />

      {niveis.map(
        (
          nivel
        ) => {
          const ativo =
            selecionado?.id ===
            nivel.andar.id;

          return (
            <group
              key={
                nivel
                  .andar
                  .id
              }
            >
              <Box
                position={[
                  0,
                  nivel.y,
                  0,
                ]}
                size={[
                  largura,
                  alturaNivel,
                  profundidade,
                ]}
                color={
                  ativo
                    ? "#eee4d5"
                    : "#d8ccb6"
                }
                roughness={
                  0.86
                }
                onClick={
                  clicar(
                    nivel.andar
                  )
                }
              />

              <Linha
                position={[
                  0,
                  nivel.y -
                    alturaNivel /
                      2 -
                    0.055,
                  0,
                ]}
                size={[
                  largura +
                    0.56,
                  0.11,
                  profundidade +
                    0.52,
                ]}
                color="#c6b79f"
              />

              <Linha
                position={[
                  0,
                  nivel.y +
                    alturaNivel /
                      2 +
                    0.055,
                  0,
                ]}
                size={[
                  largura +
                    0.56,
                  0.11,
                  profundidade +
                    0.52,
                ]}
                color="#c6b79f"
              />

              {[
                -3.75,
                -2.5,
                -1.25,
                0,
                1.25,
                2.5,
                3.75,
              ].map(
                (
                  x
                ) => (
                  <Box
                    key={`${nivel.andar.id}-junta-${x}`}
                    position={[
                      x,
                      nivel.y,
                      profundidade /
                        2 +
                        0.012,
                    ]}
                    size={[
                      0.025,
                      0.46,
                      0.025,
                    ]}
                    color="#b9aa92"
                    roughness={
                      0.9
                    }
                    onClick={
                      clicar(
                        nivel.andar
                      )
                    }
                  />
                )
              )}

              {ativo && (
                <Label
                  position={[
                    6.05,
                    nivel.y,
                    0.35,
                  ]}
                  titulo={
                    nivel.nome
                  }
                  subtitulo="Área técnica superior"
                  ativo
                  onClick={() =>
                    onSelect(
                      nivel.andar
                    )
                  }
                />
              )}
            </group>
          );
        }
      )}

      <Linha
        position={[
          0,
          topoHeliponto -
            0.2,
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
        position={[
          0,
          topoHeliponto,
          0,
        ]}
        size={[
          9.42,
          0.18,
          7.82,
        ]}
        color={
          selecionado?.id ===
          heliponto?.id
            ? "#76b8cb"
            : "#4d91a7"
        }
        roughness={
          0.62
        }
        onClick={
          clicar(
            heliponto
          )
        }
      />

      <mesh
        position={[
          0,
          topoHeliponto +
            0.1,
          0,
        ]}
        rotation={[
          -Math.PI /
            2,
          0,
          0,
        ]}
        onClick={
          clicar(
            heliponto
          )
        }
      >
        <ringGeometry
          args={[
            1.28,
            1.4,
            64,
          ]}
        />

        <meshStandardMaterial
          color="#f8fafc"
        />
      </mesh>

      <Linha
        position={[
          0,
          topoHeliponto +
            0.12,
          0,
        ]}
        size={[
          1.62,
          0.03,
          0.14,
        ]}
        color="#f8fafc"
      />

      <Linha
        position={[
          0,
          topoHeliponto +
            0.12,
          0,
        ]}
        size={[
          0.14,
          0.03,
          1.62,
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
  onSelect,
}) {
  const mostrar =
    camada ===
      "geral" ||
    camada ===
      "subsolos";

  if (
    !mostrar
  ) {
    return null;
  }

  const lista =
    ordenarAndares(
      andares.filter(
        (
          andar
        ) =>
          Number(
            andar.ordem
          ) <
          0
      )
    ).reverse();

  const espacamento =
    1.22;

  const alturaLivre =
    0.96;

  const largura =
    12.75;

  const profundidade =
    10.82;

  return (
    <group>
      {lista.map(
        (
          andar,
          index
        ) => {
          const y =
            -(
              index +
              1.55
            ) *
            espacamento;

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
                  largura,
                  0.16,
                  profundidade,
                ]}
                color={
                  selecionado
                    ? "#22d3ee"
                    : "#334155"
                }
                opacity={
                  1
                }
                roughness={
                  0.72
                }
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  onSelect(
                    andar
                  );
                }}
              />

              <Linha
                position={[
                  0,
                  y +
                    alturaLivre,
                  -5.24,
                ]}
                size={[
                  largura,
                  0.07,
                  0.12,
                ]}
                color="#e2e8f0"
              />

              {[
                -4.65,
                -1.55,
                1.55,
                4.65,
              ].map(
                (
                  x
                ) => (
                  <group
                    key={`${andar.id}-estrutura-${x}`}
                  >
                    <Box
                      position={[
                        x,
                        y +
                          alturaLivre /
                            2,
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
                        y +
                          alturaLivre /
                            2,
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
                )
              )}

              {[
                -4.1,
                -2.35,
                -0.6,
                1.15,
                2.9,
                4.3,
              ].map(
                (
                  x,
                  carIndex
                ) => (
                  <Carro
                    key={`${andar.id}-carro-${x}`}
                    position={[
                      x,
                      y +
                        0.13,
                      1.55,
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
                  -7.32,
                  y +
                    0.18,
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

      <Linha
        position={[
          0,
          0.04,
          0,
        ]}
        size={[
          13.45,
          0.1,
          11.42,
        ]}
        color="#64748b"
      />

      <Label
        position={[
          -7.36,
          0.2,
          2.2,
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
      (
        andar
      ) =>
        Number(
          andar.ordem
        ) ===
        0
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

function PainelAndarLateral({
  andar,
  locais,
  arquivos,
  aberto,
  onAlternar,
}) {
  if (
    !andar
  ) {
    return null;
  }

  const fotos =
    arquivos.filter(
      (
        arquivo
      ) =>
        arquivo.tipoArquivo ===
        "foto"
    );

  const plantas =
    arquivos.filter(
      (
        arquivo
      ) =>
        arquivo.tipoArquivo !==
        "foto"
    );

  const primeiraPlanta =
    plantas[0];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={
          onAlternar
        }
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-xs font-black uppercase text-blue-600">
            Pavimento selecionado
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            {
              andar.nome
            }
          </h2>
        </div>

        {aberto ? (
          <ChevronUp
            size={
              18
            }
          />
        ) : (
          <ChevronDown
            size={
              18
            }
          />
        )}
      </button>

      {aberto && (
        <>
          <p className="mt-2 text-sm text-slate-500">
            {andar.observacao ||
              "Sem observações cadastradas."}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold text-slate-400">
                Locais
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                {
                  locais.length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold text-slate-400">
                Fotos
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                {
                  fotos.length
                }
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-bold text-slate-400">
                Plantas
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                {
                  plantas.length
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              primeiraPlanta &&
              window.open(
                primeiraPlanta.urlPublica,
                "_blank",
                "noopener,noreferrer"
              )
            }
            disabled={
              !primeiraPlanta
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText
              size={
                17
              }
            />

            Abrir planta
          </button>

          <div className="mt-5">
            <p className="text-sm font-black text-slate-800">
              Locais e equipamentos
            </p>

            {locais.length ? (
              <div className="mt-2 max-h-[250px] space-y-2 overflow-auto">
                {locais.map(
                  (
                    local
                  ) => (
                    <div
                      key={
                        local.id
                      }
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-black text-slate-800">
                        {
                          local.nome
                        }
                      </p>

                      <p className="mt-1 text-xs font-bold text-blue-700">
                        {
                          local.tipo
                        }
                      </p>

                      {local.descricao && (
                        <p className="mt-1 text-xs text-slate-500">
                          {
                            local.descricao
                          }
                        </p>
                      )}
                    </div>
                  )
                )}
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
    useRef(
      null
    );

  const fotoInput =
    useRef(
      null
    );

  const plantaInput =
    useRef(
      null
    );

  if (
    !entidade
  ) {
    return null;
  }

  const fotos =
    arquivos.filter(
      (
        arquivo
      ) =>
        arquivo.tipoArquivo ===
        "foto"
    );

  const plantas =
    arquivos.filter(
      (
        arquivo
      ) =>
        arquivo.tipoArquivo !==
        "foto"
    );

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={
          onAlternar
        }
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
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
        </div>

        {aberto ? (
          <ChevronUp
            size={
              18
            }
          />
        ) : (
          <ChevronDown
            size={
              18
            }
          />
        )}
      </button>

      {aberto && (
        <>
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
                size={
                  17
                }
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
                size={
                  17
                }
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
                size={
                  17
                }
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
              onChange={(
                event
              ) =>
                onUpload(
                  event.target.files?.[0],
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
              onChange={(
                event
              ) =>
                onUpload(
                  event.target.files?.[0],
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
              onChange={(
                event
              ) =>
                onUpload(
                  event.target.files?.[0],
                  "planta"
                )
              }
            />
          </div>

          {salvando && (
            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-blue-700">
              <Loader2
                size={
                  15
                }
                className="animate-spin"
              />

              Enviando arquivo...
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm font-black text-slate-800">
              Fotos
            </p>

            {fotos.length ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {fotos.map(
                  (
                    arquivo
                  ) => (
                    <div
                      key={
                        arquivo.id
                      }
                      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
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
                          src={
                            arquivo.urlPublica
                          }
                          alt={
                            arquivo.nome
                          }
                          className="h-24 w-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onExcluir(
                            arquivo
                          )
                        }
                        className="absolute right-1 top-1 rounded-lg bg-rose-600 p-1.5 text-white shadow"
                        title="Excluir foto"
                      >
                        <Trash2
                          size={
                            13
                          }
                        />
                      </button>
                    </div>
                  )
                )}
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
                {plantas.map(
                  (
                    arquivo
                  ) => (
                    <div
                      key={
                        arquivo.id
                      }
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
                          size={
                            18
                          }
                          className="shrink-0 text-rose-500"
                        />

                        <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-700">
                          {
                            arquivo.nome
                          }
                        </span>

                        <span className="text-xs font-black text-blue-600">
                          Abrir
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onExcluir(
                            arquivo
                          )
                        }
                        className="rounded-lg bg-rose-50 p-1.5 text-rose-700"
                        title="Excluir planta ou PDF"
                      >
                        <Trash2
                          size={
                            14
                          }
                        />
                      </button>
                    </div>
                  )
                )}
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
            Cadastre tampas, caixas, cubículos e equipamentos técnicos.
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
        >
          <Plus
            size={
              18
            }
          />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={
            form.nome
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                nome:
                  event.target.value,
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
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                categoria:
                  event.target.value,
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
            form.lado
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                lado:
                  event.target.value,
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
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                tipoVisual:
                  event.target.value,
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
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                modoImplantacao:
                  event.target.value,
              })
            )
          }
          className="rounded-2xl border border-slate-200 bg-white p-3 text-sm"
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

        <input
          value={
            form.cor
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                valor
              ) => ({
                ...valor,
                cor:
                  event.target.value,
              })
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
          <MousePointer2
            size={
              17
            }
          />

          {posicionamento.ativo
            ? "Clique no terreno do mapa"
            : "Escolher local no mapa"}
        </button>

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
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        valor
                      ) => ({
                        ...valor,
                        [campo]:
                          Number(
                            event.target.value
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
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        valor
                      ) => ({
                        ...valor,
                        [campo]:
                          Number(
                            event.target.value
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
                  event.target.value,
              })
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
              size={
                17
              }
              className="animate-spin"
            />
          ) : (
            <Save
              size={
                17
              }
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
              size={
                17
              }
            />

            Remover
          </button>
        )}
      </div>
    </div>
  );
}

export default function Mapa3D() {
  const [
    andares,
    setAndares,
  ] =
    useState(
      []
    );

  const [
    locais,
    setLocais,
  ] =
    useState(
      []
    );

  const [
    itensExternos,
    setItensExternos,
  ] =
    useState(
      []
    );

  const [
    arquivos,
    setArquivos,
  ] =
    useState(
      []
    );

  const [
    andarSelecionado,
    setAndarSelecionado,
  ] =
    useState(
      null
    );

  const [
    itemSelecionado,
    setItemSelecionado,
  ] =
    useState(
      null
    );

  const [
    entidadeSelecionada,
    setEntidadeSelecionada,
  ] =
    useState(
      null
    );

  const [
    cadastroExternoAberto,
    setCadastroExternoAberto,
  ] =
    useState(
      false
    );

  const [
    painelAberto,
    setPainelAberto,
  ] =
    useState(
      () =>
        typeof window !==
          "undefined" &&
        window.innerWidth >=
          1280
    );

  const [
    painelLocaisAberto,
    setPainelLocaisAberto,
  ] =
    useState(
      true
    );

  const [
    painelArquivosAberto,
    setPainelArquivosAberto,
  ] =
    useState(
      true
    );

  const [
    menuMobileAberto,
    setMenuMobileAberto,
  ] =
    useState(
      false
    );

  const [
    camada,
    setCamada,
  ] =
    useState(
      "geral"
    );

  const [
    menuCamadasAberto,
    setMenuCamadasAberto,
  ] =
    useState(
      true
    );

  const [
    posicionamento,
    setPosicionamento,
  ] =
    useState({
      ativo:
        false,
      lado:
        "frente",
      coordenadas:
        null,
    });

  const [
    carregando,
    setCarregando,
  ] =
    useState(
      true
    );

  const [
    salvando,
    setSalvando,
  ] =
    useState(
      false
    );

  const [
    erro,
    setErro,
  ] =
    useState(
      ""
    );

  const [
    resetCamera,
    setResetCamera,
  ] =
    useState(
      0
    );

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
      setArquivos(
        []
      );

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

    setErro(
      ""
    );

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

      const listaAndaresSem13 =
        listaAndares.filter(
          (
            andar
          ) =>
            Number(
              andar.ordem
            ) !==
            13
        );

      setAndares(
        listaAndaresSem13
      );

      setLocais(
        listaLocais
      );

      setItensExternos(
        listaItens
      );

      const terreo =
        listaAndaresSem13.find(
          (
            andar
          ) =>
            Number(
              andar.ordem
            ) ===
            0
        );

      if (
        terreo
      ) {
        const entidade = {
          tipo:
            "andar",
          dados:
            terreo,
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
    } catch (
      error
    ) {
      console.error(
        error
      );

      setErro(
        "Não foi possível carregar o Mapa 3D."
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

  async function selecionarAndar(
    andar
  ) {
    const entidade = {
      tipo:
        "andar",
      dados:
        andar,
    };

    setAndarSelecionado(
      andar
    );

    setItemSelecionado(
      null
    );

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
      tipo:
        "item_externo",
      dados:
        item,
    };

    setItemSelecionado(
      item
    );

    setAndarSelecionado(
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

    await carregarArquivos(
      entidade
    );
  }

  async function salvarItemExterno(
    form
  ) {
    setSalvando(
      true
    );

    setErro(
      ""
    );

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
    const confirmar =
      window.confirm(
        `Remover "${item.nome}"?`
      );

    if (
      !confirmar
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

      setItemSelecionado(
        null
      );

      setEntidadeSelecionada(
        null
      );

      setArquivos(
        []
      );
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

    setErro(
      ""
    );

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
        "Não foi possível enviar o arquivo."
      );
    } finally {
      setSalvando(
        false
      );
    }
  }

  async function excluirArquivoProtegido(
    arquivo
  ) {
    const senha =
      window.prompt(
        "Digite a senha para excluir este arquivo:"
      );

    if (
      !senha
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `Excluir "${arquivo.nome}" definitivamente?`
      );

    if (
      !confirmar
    ) {
      return;
    }

    setSalvando(
      true
    );

    setErro(
      ""
    );

    try {
      await excluirArquivoProtegidoMapa3D(
        arquivo.id,
        arquivo.caminhoStorage,
        senha
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
      setSalvando(
        false
      );
    }
  }

  function ativarPosicionamento(
    lado
  ) {
    setPosicionamento({
      ativo:
        true,
      lado,
      coordenadas:
        null,
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
        ativo:
          false,
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
          size={
            32
          }
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
            size={
              18
            }
          />

          <span>
            {
              erro
            }
          </span>
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
                Torre espelhada, pavimentos técnicos em pedra, Ferrero, áreas externas e subsolos.
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
                  size={
                    16
                  }
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
                  size={
                    16
                  }
                />

                Atualizar
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

                  setEntidadeSelecionada(
                    null
                  );

                  setArquivos(
                    []
                  );
                }}
                className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700"
              >
                <Plus
                  size={
                    16
                  }
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
                    size={
                      16
                    }
                  />
                ) : (
                  <Maximize2
                    size={
                      16
                    }
                  />
                )}

                Painel
              </button>
            </div>
          </div>

          <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 xl:min-h-[900px] xl:grid-cols-[200px_175px_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-100 bg-slate-50/80 p-4 xl:block">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <Building2
                  size={
                    22
                  }
                  className="text-blue-600"
                />

                <p className="mt-2 font-black text-slate-900">
                  Edifício JK 1455
                </p>

                <p className="text-[11px] text-slate-400">
                  Gestão predial
                </p>
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
                      size={
                        16
                      }
                    />
                  ) : (
                    <ChevronDown
                      size={
                        16
                      }
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
                            size={
                              15
                            }
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
                          size={
                            13
                          }
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

            <aside className="hidden border-r border-slate-100 bg-white p-3 xl:block">
              <p className="px-2 text-xs font-black uppercase text-slate-400">
                Pavimentos
              </p>

              <div className="mt-2 max-h-[870px] space-y-1 overflow-auto">
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
                      </button>
                    )
                  )}
              </div>
            </aside>

            <div className="min-h-[calc(100vh-190px)] bg-gradient-to-b from-slate-50 via-blue-50 to-slate-100 xl:min-h-[900px]">
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
                    23,
                    18,
                    25,
                  ]}
                  fov={
                    46
                  }
                />

                <ambientLight
                  intensity={
                    0.82
                  }
                />

                <directionalLight
                  position={[
                    10,
                    15,
                    9,
                  ]}
                  intensity={
                    1.42
                  }
                  castShadow
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
                  scale={
                    28
                  }
                  blur={
                    3
                  }
                  far={
                    10
                  }
                  position={[
                    0,
                    -7.8,
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
                  minDistance={
                    8
                  }
                  maxDistance={
                    78
                  }
                  target={[
                    0,
                    5.1,
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
          <section className="fixed inset-x-3 bottom-3 top-20 z-[80] overflow-y-auto rounded-3xl bg-slate-100/95 p-3 shadow-2xl backdrop-blur xl:static xl:inset-auto xl:z-auto xl:overflow-visible xl:rounded-none xl:bg-transparent xl:p-0 xl:shadow-none">
            <button
              type="button"
              onClick={() =>
                setPainelAberto(
                  false
                )
              }
              className="mb-3 ml-auto flex rounded-xl bg-white p-2 text-slate-700 shadow xl:hidden"
              title="Fechar painel"
            >
              <X
                size={
                  18
                }
              />
            </button>

            <div className="space-y-5">
              {andarSelecionado && (
                <PainelAndarLateral
                  andar={
                    andarSelecionado
                  }
                  locais={
                    locaisSelecionados
                  }
                  arquivos={
                    arquivos
                  }
                  aberto={
                    painelLocaisAberto
                  }
                  onAlternar={() =>
                    setPainelLocaisAberto(
                      (
                        valor
                      ) =>
                        !valor
                    )
                  }
                />
              )}

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
                aberto={
                  painelArquivosAberto
                }
                onAlternar={() =>
                  setPainelArquivosAberto(
                    (
                      valor
                    ) =>
                      !valor
                  )
                }
                onUpload={
                  enviarArquivo
                }
                onExcluir={
                  excluirArquivoProtegido
                }
              />

              {cadastroExternoAberto && (
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

                    setArquivos(
                      []
                    );
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
            setMenuMobileAberto(
              true
            )
          }
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl"
        >
          Pavimentos
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
                <X
                  size={
                    18
                  }
                />
              </button>
            </div>

            <div className="mt-3 space-y-1">
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
                        {
                          andar.nome
                        }
                      </span>
                    </button>
                  )
                )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-black uppercase text-slate-400">
                Itens externos
              </p>

              <div className="mt-2 space-y-1">
                {itensOrdenados.map(
                  (
                    item
                  ) => (
                    <button
                      type="button"
                      key={
                        item.id
                      }
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
                      <MapPin
                        size={
                          14
                        }
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
          </div>
        </div>
      )}
    </div>
  );
}
