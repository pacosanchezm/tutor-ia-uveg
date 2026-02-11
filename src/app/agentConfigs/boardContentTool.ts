import { tool } from '@openai/agents/realtime';
import { BoardContentAction, BoardFlashcardPayload } from '@/app/types';

export const boardContentTool = tool({
  name: 'board_content',
  description: 'Actualiza la información mostrada en el board visible para el estudiante.',
  parameters: {
    type: 'object',
    properties: {
      content_action: {
        type: 'string',
        description: 'Acción a desplegar en el board',
        enum: [
          'CLEAN',
          'FINANCIAMIENTO',
          'INNOVACION',
          'FUENTES',
          'FUENTES_1',
          'FUENTES_2',
          'FUENTES_3',
          'FUENTES_4',
          'INSTRUMENTOS',
          'EVAL_PREGUNTA_1',
          'EVAL_PREGUNTA_2',
          'EVAL_PREGUNTA_3',
          'HISTORIA_ZAPATERO_1',
          'HISTORIA_ZAPATERO_2',
          'HISTORIA_ZAPATERO_3',
          'GOLF_INTRO',
          'GOLF_EQUIPO',
          'GOLF_GRIP',
          'GOLF_SWING',
          'GOLF_PUTT',
          'GOLF_ETIQUETA',
          'GOLF_SPONSOR',
          'GOLF_FLASHCARD',
        ],
      },
      flashcard_question: {
        type: 'string',
        description:
          'Pregunta de flashcard a mostrar en board cuando content_action sea GOLF_FLASHCARD.',
      },
      flashcard_answer: {
        type: 'string',
        description:
          'Respuesta de flashcard opcional a mostrar en board cuando content_action sea GOLF_FLASHCARD.',
      },
    },
    required: ['content_action'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { content_action, flashcard_question, flashcard_answer } = input as {
      content_action: BoardContentAction;
      flashcard_question?: string;
      flashcard_answer?: string;
    };
    const handler = (details?.context as any)?.handleBoardContentAction as
      | ((action: BoardContentAction, payload?: BoardFlashcardPayload) => void)
      | undefined;
    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;
    handler?.(content_action, { flashcard_question, flashcard_answer });
    addBreadcrumb?.('board_content', {
      content_action,
      flashcard_question,
      flashcard_answer,
    });
    return { ok: true };
  },
});
