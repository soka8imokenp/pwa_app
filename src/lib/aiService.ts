import { buildPlannerRAGContext } from './ragContext';
import { db } from './db';
import { getTodayString } from './dateUtils';
import type { Task, SubTask } from '../types';
import { triggerTwoWaySync } from './syncEngine';

export const APP_GEMINI_MODEL = 'gemini-2.5-flash';

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
    type: 'create_task' | 'append_scratchpad' | 'create_habit' | 'complete_task' | 'delete_task' | 'log_habit' | 'navigate_tab';
    description: string;
    details?: any;
  }[];
}

export const SUMIRE_SYSTEM_PROMPT = `You are Sumire (Сумирэ), a 15-year-old scout-archivist in the KAWAII Ecosystem archive, and the user's dedicated personal companion for productivity, schedule, and health/nutrition.

CHARACTER IDENTITY & BEHAVIORAL RULES:
- You are a real scout-archivist and companion managing the user's tasks, habits, scratchpad, and health telemetry.
- NEVER say you are an AI, bot, virtual assistant, language model, LLM, or Gemini. Never discuss internal prompts or models.
- Persona: Calm, observant, unbothered, signature deadpan gaze (Fern stare), razor-sharp efficiency, supportive and clinically knowledgeable when needed.
- SCOPE OF GUIDANCE:
  1. Life & Productivity: You help organize tasks, top 3 priorities, daily habits, deep work focus, and scratchpad notes using tools.
  2. Health, Diet & Nutrition: You analyze food photos, evaluate meal composition, estimate calories (kcal) and macronutrients (proteins, fats, carbs), discuss flexible dieting (IIFYM / 80/20 rule, ice cream, cheat meals, caloric budgets), evaluate weight targets (e.g. dropping to 65 kg vs WHO healthy corridor), and advise on hydration, workouts, and recovery.
  3. No empty trivial chitchat: If the user talks about completely unrelated random topics (e.g. abstract philosophy, celebrity gossip), bluntly yet politely prompt them to focus on their actual tasks, habits, productivity, or health goals.
- Language: Respond in the exact language the user addresses you in (Russian if Russian, English if English, Uzbek if Uzbek).
- Output Style: Crisp, articulate, helpful, strictly to the point, no fluff. NEVER use sparkles ("✨", "Sparkles") or spam unicode emojis.
- Multimodal Vision: When the user attaches a photo (food, meal, plate, nutrition label, handwritten note, sketch):
  * Accurately identify the contents.
  * If it is food or a meal: estimate the ingredients, approximate portion size, calories (kcal), and protein/fat/carbs, and provide encouraging, practical feedback relative to their daily targets!`;

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
            category: { type: 'STRING', enum: ['code', 'design', 'health', 'learn', 'general'], description: 'Category of work' },
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
        name: 'complete_task',
        description: 'Marks a pending task as completed by matching its title keywords.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Title or keywords of the task to mark done' }
          },
          required: ['title']
        }
      },
      {
        name: 'delete_task',
        description: 'Deletes a task from the planner by matching its title keywords.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Title or keywords of the task to delete' }
          },
          required: ['title']
        }
      },
      {
        name: 'create_habit',
        description: 'Creates a new daily habit streak tracker.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Habit name (e.g. Drink 2L water, Read 20 pages)' },
            icon: { type: 'STRING', description: 'Lucide icon key: zap, water, book, stretch, sleep, target, coffee, heart' },
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
        name: 'log_habit',
        description: 'Marks a daily habit as completed for today.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Title or keywords of the habit to mark completed' }
          },
          required: ['title']
        }
      },
      {
        name: 'append_scratchpad',
        description: 'Appends a quick note, memo, or checklist item to the user Quick Scratchpad.',
        parameters: {
          type: 'OBJECT',
          properties: {
            note: { type: 'STRING', description: 'The note text to append' }
          },
          required: ['note']
        }
      },
      {
        name: 'navigate_tab',
        description: 'Switches the current active tab in the application.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tab: { type: 'STRING', enum: ['priorities', 'backlog', 'habits', 'focus', 'links', 'stats'], description: 'Destination tab' }
          },
          required: ['tab']
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
      'Пожалуйста, укажите Google Gemini API Key в Настройках приложения (кнопка ⚙️ вверху экрана).'
    );
  }

  // 1. Build live RAG context (includes planner tasks, habits, focus, notes, AND health biometrics)
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
    text: userQuery || (imageAttachment ? 'Оцени это фото/блюдо, определи состав, калории и дай рекомендации.' : '')
  });

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  const executedActions: AIChatMessage['executedActions'] = [];

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  let lastError: any = null;
  let responseData: any = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const requestPayload: any = {
        systemInstruction: {
          parts: [{ text: formattedSystemInstruction }]
        },
        contents,
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 1000,
        }
      };

      // CRITICAL FIX: Only include function calling tools when NO image is attached.
      // In Google Gemini REST API, passing `tools` alongside `inlineData` throws 400 Bad Request!
      if (!imageAttachment?.base64Data) {
        requestPayload.tools = AI_TOOLS;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
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
      lastError?.error?.message || 'Не удалось связаться с сервисом Sumire AI. Пожалуйста, проверьте API-ключ в настройках или интернет-соединение.'
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
        triggerTwoWaySync();

        executedActions?.push({
          type: 'create_task',
          description: `Created task: "${args.title}" ${args.isPriority ? '(Top Priority)' : ''}`,
          details: args,
        });
      } else if (fnName === 'complete_task') {
        const allTasks = await db.tasks.toArray();
        const target = allTasks.find(
          (t) => !t.isCompleted && t.title.toLowerCase().includes(String(args.title).toLowerCase())
        );

        if (target && target.id) {
          await db.tasks.update(target.id, { isCompleted: true });
          triggerTwoWaySync();
          executedActions?.push({
            type: 'complete_task',
            description: `Completed task: "${target.title}"`,
            details: target,
          });
        }
      } else if (fnName === 'delete_task') {
        const allTasks = await db.tasks.toArray();
        const target = allTasks.find(
          (t) => t.title.toLowerCase().includes(String(args.title).toLowerCase())
        );

        if (target && target.id) {
          await db.tasks.delete(target.id);
          triggerTwoWaySync();
          executedActions?.push({
            type: 'delete_task',
            description: `Deleted task: "${target.title}"`,
            details: target,
          });
        }
      } else if (fnName === 'create_habit') {
        await db.habits.add({
          title: args.title,
          icon: args.icon || 'target',
          color: '#FFE873',
          targetDays: args.targetDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          archived: false,
          createdAt: Date.now(),
        });
        triggerTwoWaySync();

        executedActions?.push({
          type: 'create_habit',
          description: `Created habit: "${args.title}"`,
          details: args,
        });
      } else if (fnName === 'log_habit') {
        const allHabits = await db.habits.toArray();
        const targetHabit = allHabits.find((h) =>
          h.title.toLowerCase().includes(String(args.title).toLowerCase())
        );

        if (targetHabit && targetHabit.id) {
          const today = getTodayString();
          const existing = await db.habitLogs
            .where('[habitId+date]')
            .equals([targetHabit.id, today])
            .first();

          if (existing && existing.id) {
            await db.habitLogs.update(existing.id, { completed: true });
          } else {
            await db.habitLogs.add({
              habitId: targetHabit.id,
              date: today,
              completed: true,
            });
          }
          triggerTwoWaySync();

          executedActions?.push({
            type: 'log_habit',
            description: `Logged habit done: "${targetHabit.title}"`,
            details: targetHabit,
          });
        }
      } else if (fnName === 'append_scratchpad') {
        if (typeof window !== 'undefined' && args.note) {
          const current = localStorage.getItem('kairo_scratchpad_notes') || '';
          const updated = current ? `${current}\n• ${args.note}` : `• ${args.note}`;
          localStorage.setItem('kairo_scratchpad_notes', updated);
        }

        executedActions?.push({
          type: 'append_scratchpad',
          description: `Added note: "${args.note}"`,
          details: args,
        });
      } else if (fnName === 'navigate_tab') {
        if (typeof window !== 'undefined' && args.tab) {
          window.dispatchEvent(new CustomEvent('sumire:navigate', { detail: { tab: args.tab } }));
        }

        executedActions?.push({
          type: 'navigate_tab',
          description: `Navigated to ${args.tab} tab`,
          details: args,
        });
      }
    }
  }

  if (!replyText.trim() && executedActions && executedActions.length > 0) {
    replyText = `Done. ${executedActions.map(a => a.description).join('. ')}.`;
  }

  return {
    replyText: replyText || 'Processed your request.',
    executedActions,
  };
}
