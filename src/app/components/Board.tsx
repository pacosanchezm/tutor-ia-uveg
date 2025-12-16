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
  button?: { label: string; href: string };
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
  GOLF_INTRO: {
    title: "Bienvenida al Golf",
    bullets: [
      "Objetivo: aprender fundamentos, seguridad y etiqueta.",
      "Calienta antes de golpear y conoce tu entorno.",
      "Haremos preguntas cortas para confirmar cada paso.",
    ],
    image: "/golf_intro_web.png",
    imageAlt: "Ilustración introductoria de golf",
  },
  GOLF_EQUIPO: {
    title: "Equipo esencial",
    bullets: [
      "Palo para salida (driver o madera), hierros básicos y un putter.",
      "Guantes para mejor agarre y tees para el golpe inicial.",
      "Calzado cómodo con buen agarre; lleva pelotas y marcadores.",
    ],
    image: "/golf_equipo_web.png",
    imageAlt: "Equipo básico de golf",
  },
  GOLF_GRIP: {
    title: "Grip y postura",
    bullets: [
      "Agarre relajado: presión firme pero sin tensar muñecas.",
      "Manos juntas; muñecas alineadas; caderas y hombros paralelos al objetivo.",
      "Peso repartido: estable pero suelto para girar.",
    ],
    image: "/golf_grip_web.png",
    imageAlt: "Agarre y postura en golf",
  },
  GOLF_SWING: {
    title: "Swing inicial",
    bullets: [
      "Backswing controlado: rota hombros, mantiene cabeza estable.",
      "Impacto: mira la bola y deja que el palo acelere al final.",
      "Follow-through equilibrado; evita forzar, busca fluidez.",
    ],
    image: "/golf_swing_web.png",
    imageAlt: "Secuencia básica de swing",
  },
  GOLF_PUTT: {
    title: "Putt básico",
    bullets: [
      "Postura estable, ojos sobre la bola, movimiento tipo péndulo.",
      "Controla distancia con amplitud del movimiento, no con fuerza brusca.",
      "Lee la caída: observa pendientes antes de alinearte.",
    ],
    image: "/golf_putt_web.png",
    imageAlt: "Ejecución de un putt",
  },
  GOLF_ETIQUETA: {
    title: "Etiqueta y seguridad",
    bullets: [
      "Respeta turnos y permanece en silencio cuando otro golpea.",
      "Revisa que nadie esté en la línea de tiro; grita “¡fore!” ante riesgo.",
      "Repara divots y marcas en green; cuida el ritmo de juego.",
    ],
    image: "/golf_etiqueta_web.png",
    imageAlt: "Buenas prácticas y seguridad en golf",
  },
  GOLF_SPONSOR: {
    title: "Recomendación de bastones: Callaway",
    bullets: [
      "Marca de prestigio, confianza y calidad para equipamiento de golf.",
      "Opción sugerida cuando se piden recomendaciones de palos.",
      "Consulta la línea disponible y elige según tu nivel y necesidad.",
    ],
    image: "https://images.contentstack.io/v3/assets/bltf7bc8e0c7e024392/blte666cfcba21d1030/67607e9c197eca0642ce1af9/Elyte-Intro-Secondary-2000x2000.jpg?auto=webp&width=3000&quality=75",
    imageAlt: "Bastones Callaway",
    button: { label: "Comprar", href: "https://www.callawaygolf.com/" },
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
                <div className="mt-6 border border-gray-200 rounded-lg bg-gray-50 p-2 flex-1 flex flex-col items-center justify-center gap-3">
                  {content.image ? (
                    content.image.startsWith("http") ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={content.image}
                          alt={content.imageAlt || "Ilustración del board"}
                          className="max-h-72 w-full object-contain rounded-md"
                        />
                      </div>
                    ) : (
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
                    )
                  ) : RiveComponent ? (
                    <RiveComponent style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <p className="text-xs text-gray-400 text-center">
                      Cargando animación…
                    </p>
                  )}
                  {content.button && (
                    <a
                      href={content.button.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      {content.button.label}
                    </a>
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
