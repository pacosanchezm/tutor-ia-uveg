import { tool } from '@openai/agents/realtime';
import { BoardContentAction } from '@/app/types';

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
          'INSTRUMENTOS',
          'EVAL_PREGUNTA_1',
          'EVAL_PREGUNTA_2',
          'EVAL_PREGUNTA_3',
          'HISTORIA_ZAPATERO_1',
          'HISTORIA_ZAPATERO_2',
          'HISTORIA_ZAPATERO_3',
        ],
      },
    },
    required: ['content_action'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { content_action } = input as { content_action: BoardContentAction };
    const handler = (details?.context as any)?.handleBoardContentAction as
      | ((action: BoardContentAction) => void)
      | undefined;
    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;
    handler?.(content_action);
    addBreadcrumb?.('board_content', { content_action });
    return { ok: true };
  },
});
