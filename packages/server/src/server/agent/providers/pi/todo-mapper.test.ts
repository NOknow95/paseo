import { describe, expect, test } from "vitest";

import { mapPiTodoWriteToTimelineItem } from "./todo-mapper.js";

describe("Pi todo mapper", () => {
  test("maps todowrite args to a todo timeline item", () => {
    expect(
      mapPiTodoWriteToTimelineItem(
        {
          todos: [
            {
              content: "task A",
              status: "in_progress",
              priority: "high",
              activeForm: "working on A",
            },
            { content: "task B", status: "pending" },
            { content: "task C", status: "completed" },
          ],
        },
        null,
      ),
    ).toEqual({
      type: "todo",
      items: [
        {
          id: "0",
          text: "task A",
          status: "in_progress",
          completed: false,
          activeForm: "working on A",
        },
        { id: "1", text: "task B", status: "pending", completed: false },
        { id: "2", text: "task C", status: "completed", completed: true },
      ],
    });
  });

  test("falls back to result details when args carry no todos", () => {
    expect(
      mapPiTodoWriteToTimelineItem(null, {
        content: [{ type: "text", text: "Todo list updated: 1/2 tasks" }],
        details: {
          todos: [
            { content: "task A", status: "completed" },
            { content: "task B", status: "pending" },
          ],
          summary: "1/2 tasks",
        },
      }),
    ).toEqual({
      type: "todo",
      items: [
        { id: "0", text: "task A", status: "completed", completed: true },
        { id: "1", text: "task B", status: "pending", completed: false },
      ],
    });
  });

  test("normalizes cancelled and unknown statuses to pending", () => {
    expect(
      mapPiTodoWriteToTimelineItem(
        {
          todos: [
            { content: "task A", status: "cancelled" },
            { content: "task B", status: "inProgress" },
            { content: "task C", status: "weird" },
          ],
        },
        null,
      ),
    ).toEqual({
      type: "todo",
      items: [
        { id: "0", text: "task A", status: "pending", completed: false },
        { id: "1", text: "task B", status: "in_progress", completed: false },
        { id: "2", text: "task C", status: "pending", completed: false },
      ],
    });
  });

  test("skips empty task text", () => {
    expect(
      mapPiTodoWriteToTimelineItem(
        {
          todos: [
            { content: "", status: "pending" },
            { content: "  ", status: "pending" },
          ],
        },
        null,
      ),
    ).toBeNull();
  });

  test("returns null when neither args nor result carry todos", () => {
    expect(mapPiTodoWriteToTimelineItem(null, null)).toBeNull();
    expect(mapPiTodoWriteToTimelineItem({}, { content: [] })).toBeNull();
    expect(mapPiTodoWriteToTimelineItem({ todos: "nope" }, null)).toBeNull();
  });
});
