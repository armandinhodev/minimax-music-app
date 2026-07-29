/**
 * T2ATask entity — represents an async T2A long-audio task.
 */
export interface T2ATask {
  readonly taskId: string;
  readonly status: import('../value-objects/TaskStatus').TaskStatus;
  readonly fileId?: string; // present when status is 'success'
  readonly createdAt: number; // Unix timestamp ms
}
