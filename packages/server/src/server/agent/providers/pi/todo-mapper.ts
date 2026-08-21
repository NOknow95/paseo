import type { AgentTaskItem, AgentTimelineItem } from "../../agent-sdk-types.js";

/**
 * Parse a `todowrite` tool call into a paseo `todo` timeline item.
 *
 * Pi exposes a `todowrite` tool that follows the opencode protocol:
 * `{ todos: [{ content, status, priority, activeForm }] }`, where status is
 * one of `pending | in_progress | completed | cancelled`. The same shape is
 * also echoed back in the tool result's `details.todos`.
 *
 * Emitting a `{ type: "todo" }` timeline item lets the app show the todo card
 * immediately from live stream events (taskSnapshot path), without waiting
 * for an authoritative timeline baseline (the tool_call -> extract path only
 * works once the timeline is synced, e.g. after an agent reload).
 */
export function mapPiTodoWriteToTimelineItem(
  args: unknown,
  result: unknown,
): AgentTimelineItem | null {
  const todos = readTodoItems(args) ?? readTodoItemsFromResult(result);
  if (!todos || todos.length === 0) {
    return null;
  }
  const items = todos.flatMap((todo, index) => {
    const text = readNonEmptyString(todo.content);
    if (!text) {
      return [];
    }
    const item: AgentTaskItem = {
      // COMPAT(piTodoStableId): added in v0.5.2, remove after 2027-08-25.
      // Stable per-position id lets the app diff successive snapshots as
      // updates (status/wording changes) instead of treating every re-list
      // as a batch of new tasks.
      id: String(index),
      text,
      status: normalizeTodoStatus(todo.status),
      completed: todo.status === "completed",
    };
    const activeForm = readNonEmptyString(todo.activeForm);
    if (activeForm) {
      item.activeForm = activeForm;
    }
    return [item];
  });
  if (items.length === 0) {
    return null;
  }
  return {
    type: "todo",
    items,
  };
}

function readTodoItemsFromResult(result: unknown): readonly Record<string, unknown>[] | null {
  const record = isRecord(result) ? result : null;
  const details = record && isRecord(record.details) ? record.details : null;
  if (!details) {
    return null;
  }
  return readTodoItems(details.todos) ?? readTodoItems(details);
}

function readTodoItems(value: unknown): readonly Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.every(isRecord) ? value : null;
  }
  const record = isRecord(value) ? value : null;
  if (!record) {
    return null;
  }
  const todos = record.todos;
  if (Array.isArray(todos) && todos.every(isRecord)) {
    return todos;
  }
  return null;
}

function normalizeTodoStatus(status: unknown): AgentTaskItem["status"] {
  if (status === "completed") {
    return "completed";
  }
  if (status === "in_progress" || status === "inProgress") {
    return "in_progress";
  }
  return "pending";
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
