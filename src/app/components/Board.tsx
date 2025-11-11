"use client";

import React from "react";

export interface BoardProps {
  isExpanded: boolean;
  expandedWidthClass?: string;
}

function Board({ isExpanded, expandedWidthClass }: BoardProps) {
  const widthWhenExpanded = expandedWidthClass ?? "w-1/2 overflow-auto";
  const containerClass =
    (isExpanded ? widthWhenExpanded : "w-0 overflow-hidden opacity-0") +
    " transition-all rounded-xl duration-200 ease-in-out flex flex-col bg-white";

  return (
    <div className={containerClass}>
      {isExpanded && (
        <>
          <div className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
            <span className="font-semibold">Board</span>
          </div>
          <div className="p-6 text-sm text-gray-700 leading-relaxed space-y-4">
            <p>
              Aquí podrás mostrar material complementario para la lección, como
              apuntes clave, formularios, ejercicios o recordatorios visuales.
            </p>
            <p>
              Personaliza este espacio editando el componente
              <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
                Board.tsx
              </code>
              para incluir gráficos, iframes o el contenido que prefieras.
            </p>
            <p>
              Usa el control superior para alternar entre el Board y el Log sin
              perder el estado de la sesión.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default Board;
