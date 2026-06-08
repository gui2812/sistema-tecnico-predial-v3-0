import {
  useEffect,
  useRef,
} from "react";
import Mapa3D from "./Mapa3D";

/**
 * JK 1455 — CONSULTA TÉCNICA
 *
 * Esta página reaproveita o Mapa 3D administrativo,
 * mas bloqueia e oculta os comandos de alteração.
 *
 * O prestador pode:
 * - navegar pelo edifício;
 * - girar e aproximar o prédio;
 * - selecionar pavimentos;
 * - consultar ambientes e equipamentos;
 * - abrir fotos;
 * - abrir plantas e PDFs.
 *
 * O prestador não pode:
 * - cadastrar;
 * - editar;
 * - remover;
 * - enviar fotos;
 * - enviar plantas;
 * - gerenciar pavimentos;
 * - cadastrar itens externos.
 */

const TEXTOS_BLOQUEADOS = [
  "gerenciar",
  "item externo",
  "adicionar ambiente ou equipamento",
  "adicionar item interno",
  "editar item externo",
  "editar",
  "abrir câmera",
  "adicionar foto",
  "adicionar planta ou pdf",
  "escolher local no mapa",
  "salvar pavimento",
  "salvar item",
  "atualizar item",
  "adicionar item",
  "remover",
  "excluir",
];

function normalizarTexto(
  valor = ""
) {
  return String(valor)
    .trim()
    .toLocaleLowerCase(
      "pt-BR"
    );
}

function botaoDeveSerBloqueado(
  botao
) {
  if (!botao) {
    return false;
  }

  const texto =
    normalizarTexto(
      botao.textContent
    );

  const titulo =
    normalizarTexto(
      botao.getAttribute(
        "title"
      )
    );

  return TEXTOS_BLOQUEADOS.some(
    (termo) =>
      texto === termo ||
      texto.includes(
        termo
      ) ||
      titulo === termo ||
      titulo.includes(
        termo
      )
  );
}

function aplicarModoConsulta(
  raiz
) {
  if (!raiz) {
    return;
  }

  raiz
    .querySelectorAll(
      "button"
    )
    .forEach(
      (botao) => {
        if (
          !botaoDeveSerBloqueado(
            botao
          )
        ) {
          return;
        }

        if (
          botao.dataset
            .jk1455ConsultaBloqueado ===
          "true"
        ) {
          return;
        }

        botao.dataset.jk1455ConsultaBloqueado =
          "true";

        botao.hidden =
          true;

        botao.disabled =
          true;

        botao.setAttribute(
          "aria-hidden",
          "true"
        );
      }
    );

  raiz
    .querySelectorAll(
      'input[type="file"]'
    )
    .forEach(
      (input) => {
        input.disabled =
          true;

        input.hidden =
          true;

        input.setAttribute(
          "aria-hidden",
          "true"
        );
      }
    );
}

export default function JK1455({
  user,
}) {
  const raizRef =
    useRef(null);

  useEffect(() => {
    const raiz =
      raizRef.current;

    if (!raiz) {
      return undefined;
    }

    aplicarModoConsulta(
      raiz
    );

    const observer =
      new MutationObserver(
        () => {
          aplicarModoConsulta(
            raiz
          );
        }
      );

    observer.observe(
      raiz,
      {
        childList: true,
        subtree: true,
      }
    );

    function bloquearClique(
      event
    ) {
      const botao =
        event.target.closest(
          "button"
        );

      if (!botao) {
        return;
      }

      const bloqueado =
        botao.dataset
          .jk1455ConsultaBloqueado ===
          "true" ||
        botaoDeveSerBloqueado(
          botao
        );

      if (!bloqueado) {
        return;
      }

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();
    }

    raiz.addEventListener(
      "click",
      bloquearClique,
      true
    );

    return () => {
      observer.disconnect();

      raiz.removeEventListener(
        "click",
        bloquearClique,
        true
      );
    };
  }, []);

  return (
    <div
      ref={raizRef}
      data-pagina="jk1455-consulta"
    >
      <div className="mb-4 rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
          Consulta técnica
        </p>

        <h1 className="mt-1 text-xl font-black text-slate-900">
          Edifício JK 1455
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Consulte pavimentos, ambientes, equipamentos, fotos, plantas e PDFs cadastrados.
        </p>
      </div>

      <Mapa3D
        user={user}
        modo="consulta"
      />
    </div>
  );
}
