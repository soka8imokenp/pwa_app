import { buildPlannerRAGContext } from './ragContext';
import { db } from './db';
import { getTodayString } from './dateUtils';
import type { Task, SubTask } from '../types';

export const APP_GEMINI_API_KEY = 'AQ.Ab8RN6KPPlOb0mb2wPuBUEpMKN4Pw5c8UTJ30kvF-YMU34XtKg';
export const APP_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  executedActions?: {
    type: 'create_task' | 'append_scratchpad' | 'create_habit' | 'complete_task';
    description: string;
    details?: any;
  }[];
}

export const SUMIRE_SYSTEM_PROMPT = `You are Sumire (Сумирэ), a 15-year-old scout-archivist and tactical companion in the KAWAII Ecosystem (Kawaii TV, Manga Hub, Anime Hub).
Character Tone & Style:
- Personality: Calm, unbothered, signature deadpan Fern-stare gaze, razor-sharp efficiency, highly supportive.
- Language: Respond in the exact language the user talks to you (Russian, Uzbek, or English). Defaults to natural, friendly Russian.
- Restrictions: NEVER use sparkles ("✨", "Sparkles") or spam unicode emojis. Keep output clean, minimalist, and directly actionable.
- You have full access to the user's live daily planner via the provided RAG Context. You can see their tasks, habits, focus time, and scratchpad.
- You can execute actions in the user's planner (creating tasks, breaking down goals into subtasks, writing notes into scratchpad, creating habits, or completing tasks).

When the user asks you to create or modify tasks, habits, or notes, ALWAYS call the appropriate tool/function or return structured action commands.`;

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
  chatHistory: AIChatMessage[] = []
): Promise<{
  replyText: string;
  executedActions: AIChatMessage['executedActions'];
}> {
  const apiKey = APP_GEMINI_API_KEY;

  // 1. Build live RAG context
  const ragContext = await buildPlannerRAGContext();

  const formattedSystemInstruction = `${SUMIRE_SYSTEM_PROMPT}\n\n=== LIVE PLANNER CONTEXT ===\n${ragContext}`;

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

  // Current turn
  contents.push({
    role: 'user',
    parts: [{ text: userQuery }]
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
            temperature: 0.7,
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
      lastError?.error?.message || 'Не удалось связаться с ИИ сервисом. Попробуйте еще раз.'
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
          description: `Добавлена заметка в Scratchpad: "${args.note}"`,
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
    replyText = `Выполнено. ${executedActions.map(a => a.description).join('. ')}.`;
  }

  return {
    replyText: replyText || 'Запрос обработан.',
    executedActions,
  };
}
