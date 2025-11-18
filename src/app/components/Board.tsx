"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { BoardContentAction } from "@/app/types";

export interface BoardProps {
  isExpanded: boolean;
  expandedWidthClass?: string;
  contentKey: BoardContentAction;
}

type BoardContentKey = Exclude<BoardContentAction, "CLEAN">;

const boardContentMap: Record<BoardContentKey, {
  title: string;
  bullets: string[];
  image?: string;
  imageAlt?: string;
}> = {
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

  FUENTES_1: {
    title: "Fuentes de financiamiento",
    bullets: [
      "Internas: utilidades retenidas, ahorro, aportaciones de socios.",
      "Externas: créditos bancarios, inversionistas, fondeos gubernamentales.",
      "La elección depende del costo, plazo y flexibilidad requerida.",
    ],
  },


  FUENTES_2: {
    title: "Fuentes de financiamiento",
    bullets: [
      "Internas: utilidades retenidas, ahorro, aportaciones de socios.",
      "Externas: créditos bancarios, inversionistas, fondeos gubernamentales.",
      "La elección depende del costo, plazo y flexibilidad requerida.",
    ],
  },


  FUENTES_3: {
    title: "Fuentes de financiamiento",
    bullets: [
      "Internas: utilidades retenidas, ahorro, aportaciones de socios.",
      "Externas: créditos bancarios, inversionistas, fondeos gubernamentales.",
      "La elección depende del costo, plazo y flexibilidad requerida.",
    ],
  },


  FUENTES_4: {
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
  EVAL_PREGUNTA_1: {
    title: "Pregunta 1",
    bullets: [
      "Menciona cómo se le llama al instrumento de financiamiento que comúnmente conocemos como línea de crédito.",
      "Responde con el término específico asociado a la línea revolvente.",
    ],
  },
  EVAL_PREGUNTA_2: {
    title: "Pregunta 2",
    bullets: [
      "Explica a qué se refiere el Arrendamiento o Leasing.",
      "Incluye por qué algunas empresas recurren a él.",
    ],
  },
  EVAL_PREGUNTA_3: {
    title: "Pregunta 3",
    bullets: [
      "Caso María: necesita $50,000 para horno y materia prima.",
      "Opciones: préstamo familiar, bancario, crédito revolvente, proveedores o financiamiento gubernamental.",
      "¿Qué opción o combinación recomendarías y por qué?",
    ],
    image: "/maria1.png",
    imageAlt: "Ilustración del caso de María",
  },
  HISTORIA_ZAPATERO_1: {
    title: "Un zapatero de Guadalajara enfrenta una limitación en la producción.",
    bullets: [
      "",
      
    ],
    image: "/zapaterog1.webp",
    imageAlt: "Zapatero de Guadalajara etapa 1",
  },
  HISTORIA_ZAPATERO_2: {
    title: "Solicita un préstamo bancario para adquirir maquinaria especializada.",
    bullets: [
      "",
      
    ],
    image: "/zapaterog2.webp",
    imageAlt: "Zapatero de Guadalajara etapa 2",
  },
  HISTORIA_ZAPATERO_3: {
    title: "Con la nueva maquinaria aumenta su producción y ventas.",
    bullets: [
      "",
      
    ],
    image: "/zapaterog3.webp",
    imageAlt: "Zapatero de Guadalajara etapa 3",
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

  const fuentes_1Input = useStateMachineInput(rive, stateMachineName, "FUENTES_1");
  const fuentes_2Input = useStateMachineInput(rive, stateMachineName, "FUENTES_2");
  const fuentes_3Input = useStateMachineInput(rive, stateMachineName, "FUENTES_3");
  const fuentes_4Input = useStateMachineInput(rive, stateMachineName, "FUENTES_4");




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
      FUENTES_1: fuentes_1Input,
      FUENTES_2: fuentes_2Input,
      FUENTES_3: fuentes_3Input,
      FUENTES_4: fuentes_4Input,
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
    fuentes_1Input,
    fuentes_2Input,
    fuentes_3Input,
    fuentes_4Input,
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
                  {content.image ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={content.image}
                        alt={content.imageAlt || "Ilustración del board"}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain"
                        priority
                      />
                    </div>
                  ) : RiveComponent ? (
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
