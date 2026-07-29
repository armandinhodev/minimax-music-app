import { z } from 'zod';

/**
 * TaskStatus value object — possible states of an async T2A task.
 */
export const TaskStatusSchema = z.enum([
  'processing',
  'success',
  'failed',
  'expired',
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
