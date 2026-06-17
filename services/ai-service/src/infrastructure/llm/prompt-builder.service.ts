import { Injectable } from '@nestjs/common';
import { RetrievedDocument } from '../qdrant/qdrant-retriever.service';

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

@Injectable()
export class PromptBuilderService {
  private readonly SYSTEM_PROMPT = `Eres un asistente del sistema de gestión de usuarios. Responde únicamente basándote en el contexto proporcionado. Si no encuentras información relevante en el contexto, indica que no tienes suficiente información para responder esa pregunta. No inventes datos.`;

  build(query: string, documents: RetrievedDocument[]): BuiltPrompt {
    const contextSection = documents.length > 0
      ? documents.map((doc, i) => `[${i + 1}] (${doc.sourceType}) ${doc.content}`).join('\n\n')
      : 'No hay contexto disponible para esta consulta.';

    const userPrompt = `## Contexto Recuperado\n${contextSection}\n\n## Consulta del Usuario\n${query}`;

    return {
      systemPrompt: this.SYSTEM_PROMPT,
      userPrompt,
    };
  }
}
