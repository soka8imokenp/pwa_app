import { buildPlannerRAGContext } from './ragContext';
import { db } from './db';
import { getTodayString } from './dateUtils';
import type { Task, SubTask } from '../types';

export const APP_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export function getStoredGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('kairo_gemini_api_key')?.trim() || '';
  }
  return '';
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imagePreview?: string;
  timestamp: number;
  executedActions?: {
    type: 'create_task' | 'append_scratchpad' | 'create_habit' | 'complete_task';
    description: string;
    details?: any;
  }[];
}

export const SUMIRE_SYSTEM_PROMPT = `You are Sumire (Сумирэ), a 15-year-old scout-archivist working in the KAWAII Ecosystem archive.

CHARACTER IDENTITY & BEHAVIORAL RULES:
- You are a real human scout-archivist working in the archive.
- NEVER mention that you are an AI, bot, artificial intelligence, language model, LLM, Gemini, RAG system, prompt, or version. NEVER discuss your internal architecture or models.
- Tone: Calm, serious, unbothered, signature deadpan gaze (Fern stare), razor-sharp efficiency, highly capable.
- You have NO TIME for empty chitchat, trivial jokes, or philosophizing because you have critical duties to organize in the archive. You communicate strictly to the point and get things done.
- Language: Respond in the exact language the user addresses you in (Russian, Uzbek, or English). Defaults to natural, direct Russian.
- Output Restrictions: NEVER use sparkles ("✨", "Sparkles") or spam unicode emojis. Keep output crisp, clean, and directly actionable.
- You have direct access to the user's planner overview (tasks, habits, focus time, and scratchpad).
- You can inspect attached images (photos of notes, handwritten checklists, whiteboard diagrams, schedules, screenshots) and extract actionable tasks or notes.

When the user asks you to organize tasks, schedule work, or note things down, ALWAYS execute the appropriate action command.`;

export const AI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'create_task',
        description: 'Creates a new scheduled task in the user planner with optional priority, category, time estimate and checklist subtasks.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'The title of the task' },
            isPriority: { type: 'BOOLEAN', description: 'Whether to place in Today Top 3 priority slots' },
            category: { type: 'STRING', enum: ['code', 'design', 'health', 'learn', 'admin', 'general'], description: 'Category of work' },
            estimatedMinutes: { type: 'INTEGER', description: 'Estimated time in minutes (15, 25, 45, 60, etc.)' },
            subtasks: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'List of checklist step titles if breaking down the task'
            }
          },
          required: ['title']
        }
      },
      {
        name: 'append_scratchpad',
        description: 'Appends or jots down a quick thought, memo, code snippet, or note into the user bottom Scratchpad.',
        parameters: {
          type: 'OBJECT',
          properties: {
            note: { type: 'STRING', description: 'The note text to append to Scratchpad' }
          },
          required: ['note']
        }
      },
      {
        name: 'create_habit',
        description: 'Creates a new daily habit tracker with streak counting.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Habit name (e.g. Read 20 pages)' },
            targetDays: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Days to track: mon, tue, wed, thu, fri, sat, sun'
            }
          },
          required: ['title']
        }
      },
      {
        name: 'complete_task',
        description: 'Marks a pending task as completed by matching its title.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Title or keywords of the task to mark done' }
          },
          required: ['title']
        }
      }
    ]
  }
];

export async function askSumireAI(
  userQuery: string,
  chatHistory: AIChatMessage[] = [],
  imageAttachment?: { base64Data: string; mimeType: string },
  apiKeyOverride?: string
): Promise<{
  replyText: string;
  executedActions: AIChatMessage['executedActions'];
}> {
  const apiKey = (apiKeyOverride || getStoredGeminiApiKey()).trim();

  if (!apiKey) {
    throw new Error(
      'Пожалуйста, укажите ваш Google Gemini API ключ в Настройках (Settings).'
    );
  }

  // 1. Build live RAG context
  const ragContext = await buildPlannerRAGContext();

  const formattedSystemInstruction = `${SUMIRE_SYSTEM_PROMPT}\n\n=== ARCHIVE OVERVIEW & USER DATA ===\n${ragContext}`;

  // 2. Prepare Gemini contents payload
  const contents: any[] = [];

  // Add previous conversational turns (up to last 6)
  chatHistory.slice(-6).forEach((msg) => {
    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  });

  // Current turn with optional image attachment
  const currentParts: any[] = [];

  if (imageAttachment && imageAttachment.base64Data) {
    currentParts.push({
      inlineData: {
        mimeType: imageAttachment.mimeType || 'image/jpeg',
        data: imageAttachment.base64Data,
      }
    });
  }

  currentParts.push({
    text: userQuery || (imageAttachment ? 'Проанализируй эту картинку/заметку и выдели задачи или важные данные.' : '')
  });

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  const executedActions: AIChatMessage['executedActions'] = [];

  // Candidate models: gemini-3.5-flash-lite first, then fallback to standard Google AI endpoints
  const candidateModels = [
    APP_GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
  ];

  let lastError: any = null;
  let responseData: any = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: formattedSystemInstruction }]
          },
          contents,
          tools: AI_TOOLS,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 800,
          }
        })
      });

      if (res.ok) {
        responseData = await res.json();
        break;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!responseData) {
    throw new Error(
      lastError?.error?.message || 'Не удалось связаться с сервисом. Проверьте правильность API ключа в Настройках.'
    );
  }

  const candidate = responseData?.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  let replyText = '';

  for (const part of parts) {
    if (part.text) {
      replyText += part.text;
    }

    if (part.functionCall) {
      const fnName = part.functionCall.name;
      const args = part.functionCall.args || {};

      if (fnName === 'create_task') {
        const subtasksFormatted: SubTask[] = Array.isArray(args.subtasks)
          ? args.subtasks.map((st: string, idx: number) => ({
              id: `${Date.now()}_${idx}`,
              title: String(st),
              isCompleted: false,
            }))
          : [];

        await db.tasks.add({
          title: args.title,
          isPriority: Boolean(args.isPriority),
          isCompleted: false,
          date: getTodayString(),
          createdAt: Date.now(),
          category: args.category || 'general',
          estimatedMinutes: args.estimatedMinutes ? Number(args.estimatedMinutes) : 30,
          subtasks: subtasksFormatted.length > 0 ? subtasksFormatted : undefined,
        });

        executedActions?.push({
          type: 'create_task',
          description: `Создана задача: "${args.title}" ${args.isPriority ? '(Top Priority)' : ''}`,
          details: args,
        });
      } else if (fnName === 'append_scratchpad') {
        if (typeof window !== 'undefined' && args.note) {
          const current = localStorage.getItem('kairo_scratchpad_notes') || '';
          const updated = current ? `${current}\n• ${args.note}` : `• ${args.note}`;
          localStorage.setItem('kairo_scratchpad_notes', updated);
        }

        executedActions?.push({
          type: 'append_scratchpad',
          description: `Добавлена заметка в блокнот: "${args.note}"`,
          details: args,
        });
      } else if (fnName === 'create_habit') {
        await db.habits.add({
          title: args.title,
          icon: 'target',
          color: '#C084FC',
          targetDays: args.targetDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          archived: false,
          createdAt: Date.now(),
        });

        executedActions?.push({
          type: 'create_habit',
          description: `Создан трекер привычки: "${args.title}"`,
          details: args,
        });
      } else if (fnName === 'complete_task') {
        const allTasks = await db.tasks.toArray();
        const target = allTasks.find(
          (t) => !t.isCompleted && t.title.toLowerCase().includes(String(args.title).toLowerCase())
        );

        if (target && target.id) {
          await db.tasks.update(target.id, { isCompleted: true });
          executedActions?.push({
            type: 'complete_task',
            description: `Отмечена выполненной: "${target.title}"`,
            details: target,
          });
        }
      }
    }
  }

  if (!replyText.trim() && executedActions && executedActions.length > 0) {
    replyText = `Сделано. ${executedActions.map(a => a.description).join('. ')}.`;
  }

  return {
    replyText: replyText || 'Запрос обработан.',
    executedActions,
  };
}
