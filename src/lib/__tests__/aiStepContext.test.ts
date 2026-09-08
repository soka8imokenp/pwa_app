import { describe, it, expect } from 'vitest';
import { SUMIRE_SYSTEM_PROMPT, AI_TOOLS } from '../aiService';

describe('AI Context & Step/Activity Visibility', () => {
  it('SUMIRE_SYSTEM_PROMPT: completely removes Zepp Life branding and references', () => {
    expect(SUMIRE_SYSTEM_PROMPT.toLowerCase()).not.toContain('zepp life');
    expect(SUMIRE_SYSTEM_PROMPT.toLowerCase()).not.toContain('zepp bia');
    expect(SUMIRE_SYSTEM_PROMPT.toLowerCase()).not.toContain('zepp body score');
  });

  it('SUMIRE_SYSTEM_PROMPT: asserts Daily Sumire app identity with zero-confusion rule', () => {
    expect(SUMIRE_SYSTEM_PROMPT).toContain('Daily Sumire');
    expect(SUMIRE_SYSTEM_PROMPT).toContain('APP IDENTITY & ZERO-CONFUSION MANDATE');
    expect(SUMIRE_SYSTEM_PROMPT).toContain('Under NO circumstances should you EVER claim this application is "Zepp Life"');
  });

  it('SUMIRE_SYSTEM_PROMPT: incorporates steps, pedometer, and physical activity protocol', () => {
    expect(SUMIRE_SYSTEM_PROMPT).toContain('CRITICAL STEPS, PEDOMETER & MOVEMENT PROTOCOL');
    expect(SUMIRE_SYSTEM_PROMPT).toContain('Pedometer, Steps & Movement');
    expect(SUMIRE_SYSTEM_PROMPT).toContain('Daily Movement & Pedometer Telemetry');
    expect(SUMIRE_SYSTEM_PROMPT).toContain('Physical Workouts & Active Exercise');
  });

  it('SUMIRE_SYSTEM_PROMPT: documents log_steps and set_step_goal actions', () => {
    expect(SUMIRE_SYSTEM_PROMPT).toContain('"log_steps": { steps: number');
    expect(SUMIRE_SYSTEM_PROMPT).toContain('"set_step_goal": { goal: number }');
  });

  it('AI_TOOLS: exposes log_steps and set_step_goal function declarations', () => {
    const toolDeclarations = AI_TOOLS[0].functionDeclarations;
    const logStepsTool = toolDeclarations.find((d) => d.name === 'log_steps');
    const setGoalTool = toolDeclarations.find((d) => d.name === 'set_step_goal');

    expect(logStepsTool).toBeDefined();
    expect((logStepsTool as any)?.parameters?.required).toContain('steps');

    expect(setGoalTool).toBeDefined();
    expect((setGoalTool as any)?.parameters?.required).toContain('goal');
  });
});
