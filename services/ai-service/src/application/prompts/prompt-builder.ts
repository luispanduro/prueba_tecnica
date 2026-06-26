import { Injectable } from '@nestjs/common';
import { SYSTEM_PROMPT } from './system.prompt';
import { UserDTO } from '../../infrastructure/http-clients/user-service.client';

export interface ContextChunk {
  content: string;
  source: string;
  score: number;
}

const FEW_SHOT_EXAMPLES = `

EJEMPLOS:
Pregunta: ¿Qué permisos tiene el rol ADMIN?
Respuesta: El rol ADMIN tiene los siguientes permisos: users:read, users:write, users:delete, roles:read, audit:read.

Pregunta: ¿Cómo asigno un rol a un usuario?
Respuesta: Para asignar un rol, ve a la sección Usuarios, selecciona el usuario y haz clic en "Gestionar Roles". Desde ahí puedes seleccionar uno o más roles de la lista disponible.`;

const CHAIN_OF_THOUGHT = `

Piensa paso a paso:
1. ¿Cuál es el estado del usuario? (activo/inactivo)
2. ¿Tiene roles asignados?
3. ¿Los roles tienen los permisos necesarios?
4. ¿Hay eventos de login fallido recientes en auditoría?
Basándote en estos pasos, proporciona una respuesta estructurada.`;

const COT_KEYWORDS = ['por qué', 'porque', 'analiza', 'analizar', 'explica', 'explicar'];

@Injectable()
export class PromptBuilder {
  build(query: string, contextChunks: ContextChunk[], userData?: UserDTO | null): string {
    const contextText = contextChunks.map((c) => c.content).join('\n\n---\n\n');
    const needsCot = COT_KEYWORDS.some((kw) => query.toLowerCase().includes(kw));

    let prompt = SYSTEM_PROMPT;
    prompt += `\n\nCONTEXTO DEL SISTEMA:\n${contextText}`;
    prompt += FEW_SHOT_EXAMPLES;

    if (userData) {
      prompt +=
        `\n\nDATOS DEL USUARIO:\n` +
        `- Nombre: ${userData.firstName} ${userData.lastName}\n` +
        `- Email: ${userData.email}\n` +
        `- Estado: ${userData.status}\n` +
        `- Roles asignados: ${userData.roleIds.join(', ')}`;
    }

    if (needsCot) {
      prompt += CHAIN_OF_THOUGHT;
    }

    return prompt;
  }
}
