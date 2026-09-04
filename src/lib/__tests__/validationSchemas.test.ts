import { describe, it, expect } from 'vitest';
import {
  taskSchema,
  habitSchema,
  linkSchema,
  aiMealEstimateSchema,
  validateSafe,
} from '../validationSchemas';

describe('validationSchemas', () => {
  describe('taskSchema', () => {
    it('validates a valid task successfully', () => {
      const valid = {
        title: 'Complete Ivy Lee Top 3',
        date: '2026-09-04',
        isPriority: true,
        isCompleted: false,
        category: 'code',
      };
      const res = validateSafe(taskSchema, valid);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.title).toBe('Complete Ivy Lee Top 3');
      }
    });

    it('rejects empty title', () => {
      const invalid = {
        title: '   ',
        date: '2026-09-04',
      };
      const res = validateSafe(taskSchema, invalid);
      expect(res.success).toBe(false);
    });

    it('rejects malformed date', () => {
      const invalid = {
        title: 'Task',
        date: '04-09-2026',
      };
      const res = validateSafe(taskSchema, invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('habitSchema', () => {
    it('validates a valid habit and provides defaults', () => {
      const habit = {
        title: 'Drink 2L Water',
        targetDays: ['mon', 'wed', 'fri'],
      };
      const res = validateSafe(habitSchema, habit);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.archived).toBe(false);
        expect(res.data.createdAt).toBeDefined();
      }
    });
  });

  describe('linkSchema', () => {
    it('validates URL correctly', () => {
      const link = {
        title: 'GitHub Repo',
        url: 'https://github.com/project',
      };
      const res = validateSafe(linkSchema, link);
      expect(res.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const link = {
        title: 'Broken Link',
        url: 'not-a-url',
      };
      const res = validateSafe(linkSchema, link);
      expect(res.success).toBe(false);
    });
  });

  describe('aiMealEstimateSchema', () => {
    it('coerces string nutrition numbers gracefully', () => {
      const rawAiResponse = {
        name: 'Matcha Protein Shake',
        kcal: '320',
        proteinGrams: '30',
        carbsGrams: '15',
        fatGrams: '4',
        mealType: 'snack',
      };
      const res = aiMealEstimateSchema.safeParse(rawAiResponse);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.kcal).toBe(320);
        expect(res.data.proteinGrams).toBe(30);
      }
    });
  });
});
