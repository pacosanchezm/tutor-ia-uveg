"use client";

import React, { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { BoardContentAction } from "@/app/types";

export interface BoardProps {
  isExpanded: boolean;
  expandedWidthClass?: string;
  contentKey: BoardContentAction;
}

const boardContentMap: Record<
  Exclude<BoardContentAction, "CLEAN">,
  { title: string; bullets: string[] }
> = {
  FINANCIAMIENTO: {
    title: "Rol estratégico del financiamiento",
    bullets: [
      "Permite abrir nuevas sedes, adquirir activos y entrar a mercados con oportunidad.",
      "Mantiene el capital de trabajo al día: nómina, inventario, proveedores y flujo.",
      "Sostiene la investigación y el desarrollo para innovar antes que la competencia.",
    ],
  },
  INNOVACION: {
    title: "Innovación y crecimiento",
    bullets: [
      "El financiamiento asignado a I+D acelera la creación de productos diferenciados.",
      "Permite validar nuevas soluciones sin descuidar la operación diaria.",
      "Da margen para experimentar y adaptarse a los cambios del mercado.",
    ],
  },
  FUENTES: {
    title: "Fuentes de financiamiento",
    bullets: [
      "Internas: utilidades retenidas, ahorro, aportaciones de socios.",
      "Externas: créditos bancarios, inversionistas, fondeos gubernamentales.",
      "La elección depende del costo, plazo y flexibilidad requerida.",
    ],
  },
  INSTRUMENTOS: {
    title: "Instrumentos frecuentes",
    bullets: [
      "Créditos simples o revolventes para capital de trabajo.",
      "Arrendamientos financieros para maquinaria y equipo.",
      "Emisión de deuda o capital cuando la empresa ya tiene historial sólido.",
    ],
  },
};

function Board({ isExpanded, expandedWidthClass, contentKey }: BoardProps) {
  const widthWhenExpanded = expandedWidthClass ?? "w-1/2 overflow-auto";
  const containerClass =
    (isExpanded ? widthWhenExpanded : "w-0 overflow-hidden opacity-0") +
    " transition-all rounded-xl duration-200 ease-in-out flex flex-col bg-white";

  const content =
    contentKey === "CLEAN"
      ? null
      : boardContentMap[contentKey as Exclude<BoardContentAction, "CLEAN">];
  const stateMachineName = "State Machine 1";
  const { rive, RiveComponent } = useRive({
    src: "/uveg.riv",
    autoplay: true,
    stateMachines: stateMachineName,
  });
  const cleanInput = useStateMachineInput(rive, stateMachineName, "CLEAN");
  const financiamientoInput = useStateMachineInput(
    rive,
    stateMachineName,
    "FINANCIAMIENTO",
  );
  const innovacionInput = useStateMachineInput(
    rive,
    stateMachineName,
    "INNOVACION",
  );
  const fuentesInput = useStateMachineInput(rive, stateMachineName, "FUENTES");
  const instrumentosInput = useStateMachineInput(
    rive,
    stateMachineName,
    "INSTRUMENTOS",
  );

  useEffect(() => {
    const inputMap: Partial<Record<BoardContentAction, any>> = {
      CLEAN: cleanInput,
      FINANCIAMIENTO: financiamientoInput,
      INNOVACION: innovacionInput,
      FUENTES: fuentesInput,
      INSTRUMENTOS: instrumentosInput,
    };
    const target = inputMap[contentKey];
    if (!target) return;

    Object.entries(inputMap).forEach(([key, input]) => {
      if (!input) return;
      if (input.type === "trigger") {
        if (key === contentKey) {
          input.fire();
        }
      } else {
        input.value = key === contentKey;
      }
    });
  }, [
    contentKey,
    cleanInput,
    financiamientoInput,
    innovacionInput,
    fuentesInput,
    instrumentosInput,
  ]);

  return (
    <div className={containerClass}>
      {isExpanded && (
        <>
          <div className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
            <span className="font-semibold">Board</span>
          </div>
          <div className="p-6 text-sm text-gray-700 leading-relaxed space-y-4 h-full flex flex-col">
            {content ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900">
                  {content.title}
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  {content.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="mt-6 border border-gray-200 rounded-lg bg-gray-50 p-2 flex-1 flex items-center justify-center">
                  {RiveComponent ? (
                    <RiveComponent style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <p className="text-xs text-gray-400 text-center">
                      Cargando animación…
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm italic">
                El board está limpio. Espera nuevas anotaciones del tutor.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Board;
