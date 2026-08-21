import { describe, expect, test } from "vitest";

import { parseToolResult } from "./tool-call-detail.js";
import { mapOmpTodoReminderEvent, mapOmpTodoState, mapOmpTodoToolResult } from "./todo-mapper.js";

const TODO_PHASES = [
  {
    name: "Tasks",
    tasks: [
      { content: "alpha task", status: "completed" },
      { content: "beta task", status: "in_progress" },
      { content: "gamma task", status: "pending" },
    ],
  },
] as const;

describe("OMP todo mapper", () => {
  test("maps todo tool results without losing progress status", () => {
    expect(
      mapOmpTodoToolResult(
        parseToolResult({
          content: [],
          details: {
            phases: [
              {
                name: "Tasks",
                tasks: [
                  { content: "alpha task", status: "in_progress" },
                  { content: "beta task", status: "pending" },
                  { content: "gamma task", status: "pending" },
                ],
              },
            ],
          },
        }),
      ),
    ).toEqual({
      type: "todo",
      items: [
        { id: "0", text: "alpha task", status: "in_progress", completed: false },
        { id: "1", text: "beta task", status: "pending", completed: false },
        { id: "2", text: "gamma task", status: "pending", completed: false },
      ],
    });

    expect(
      mapOmpTodoToolResult(parseToolResult({ content: [], details: { phases: TODO_PHASES } })),
    ).toEqual({
      type: "todo",
      items: [
        { id: "0", text: "alpha task", status: "completed", completed: true },
        { id: "1", text: "beta task", status: "in_progress", completed: false },
        { id: "2", text: "gamma task", status: "pending", completed: false },
      ],
    });
  });

  test("maps todo reminder events", () => {
    expect(
      mapOmpTodoReminderEvent({
        type: "todo_reminder",
        todos: [
          { content: "beta task", status: "in_progress" },
          { content: "gamma task", status: "pending" },
        ],
      }),
    ).toEqual({
      type: "todo",
      items: [
        { id: "0", text: "beta task", status: "in_progress", completed: false },
        { id: "1", text: "gamma task", status: "pending", completed: false },
      ],
    });
  });

  test("hydrates current todos from session state", () => {
    expect(
      mapOmpTodoState({
        model: null,
        thinkingLevel: "medium",
        isStreaming: false,
        isCompacting: false,
        sessionId: "session",
        messageCount: 0,
        queuedMessageCount: 0,
        todoPhases: TODO_PHASES,
      }),
    ).toEqual([
      {
        type: "todo",
        items: [
          { id: "0", text: "alpha task", status: "completed", completed: true },
          { id: "1", text: "beta task", status: "in_progress", completed: false },
          { id: "2", text: "gamma task", status: "pending", completed: false },
        ],
      },
    ]);
  });

  test("drops malformed todo inputs", () => {
    expect(mapOmpTodoReminderEvent({ type: "todo_reminder", todos: [{ content: 1 }] })).toBeNull();
    expect(
      mapOmpTodoToolResult({ details: { phases: [{ name: "Bad", tasks: [{}] }] } }),
    ).toBeNull();
  });

  test("keeps blocked work visible and excludes abandoned work from active todos", () => {
    const phases = [
      {
        name: "Tasks",
        tasks: [
          { content: "Wait for access", status: "blocked", blocker: "approval" },
          { content: "Old approach", status: "abandoned" },
        ],
      },
    ];
    const expected = {
      type: "todo",
      items: [
        {
          id: "0",
          text: "Wait for access (blocked: approval)",
          status: "pending",
          completed: false,
        },
      ],
    };
    expect(mapOmpTodoToolResult(parseToolResult({ content: [], details: { phases } }))).toEqual(
      expected,
    );
    expect(
      mapOmpTodoState({
        isStreaming: false,
        isCompacting: false,
        sessionId: "s",
        todoPhases: phases,
      }),
    ).toEqual([expected]);
    expect(
      mapOmpTodoToolResult(
        parseToolResult({
          content: [],
          details: {
            phases: [{ name: "Tasks", tasks: [{ content: "Old approach", status: "abandoned" }] }],
          },
        }),
      ),
    ).toEqual({ type: "todo", items: [] });
  });

  test("keeps the source-list index as the id when abandoned items are dropped", () => {
    // The survivor is at source index 1, so filtering the preceding abandoned
    // item must not renumber it to 0 — otherwise ids drift between snapshots.
    const phases = [
      {
        name: "Tasks",
        tasks: [
          { content: "Old approach", status: "abandoned" },
          { content: "Wait for access", status: "blocked", blocker: "approval" },
        ],
      },
    ];
    expect(
      mapOmpTodoState({
        isStreaming: false,
        isCompacting: false,
        sessionId: "s",
        todoPhases: phases,
      }),
    ).toEqual([
      {
        type: "todo",
        items: [
          {
            id: "1",
            text: "Wait for access (blocked: approval)",
            status: "pending",
            completed: false,
          },
        ],
      },
    ]);
  });
});
