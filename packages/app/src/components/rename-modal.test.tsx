import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptiveRenameModal } from "./rename-modal";
import type { EditingTextInputHandle } from "@/components/ui/text-input";

const { theme, adaptiveInputState } = vi.hoisted(() => ({
  adaptiveInputState: {
    latestProps: null as {
      onChangeText?: (next: string) => void;
      onSubmitEditing?: () => void;
    } | null,
  },
  theme: {
    spacing: { 2: 8, 3: 12 },
    fontSize: { sm: 13, base: 15 },
    borderRadius: { md: 6 },
    colors: {
      surface0: "#000",
      foreground: "#fff",
      foregroundMuted: "#aaa",
      border: "#555",
      palette: { red: { 300: "#f87171" } },
    },
  },
}));

vi.mock("react-native-unistyles", () => ({
  StyleSheet: {
    create: (factory: unknown) => (typeof factory === "function" ? factory(theme) : factory),
  },
  useUnistyles: () => ({ theme }),
}));

vi.mock("@/constants/platform", () => ({
  isWeb: true,
  isNative: false,
}));

vi.mock("@/components/adaptive-modal-sheet", async () => {
  const ReactModule = await import("react");
  const AdaptiveModalSheet = ({
    visible,
    title,
    children,
    onClose,
    testID,
  }: {
    visible: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    testID?: string;
  }) => {
    if (!visible) return null;
    return ReactModule.createElement(
      "div",
      { "data-testid": testID ?? "adaptive-modal-sheet", "data-modal-title": title },
      ReactModule.createElement(
        "button",
        {
          type: "button",
          "data-testid": "adaptive-modal-sheet-close",
          onClick: onClose,
        },
        "Close",
      ),
      children,
    );
  };
  // Mirrors production AdaptiveTextInput: native-owned input seeded by
  // initialValue, remounted (via key) when resetKey changes so the new
  // initialValue takes effect. The ref is an imperative handle object, never
  // the DOM node itself.
  const AdaptiveTextInput = ReactModule.forwardRef<EditingTextInputHandle, Record<string, unknown>>(
    (props, ref) => {
      const p = props as {
        initialValue?: string;
        defaultValue?: string;
        editable?: boolean;
        maxLength?: number;
        testID?: string;
        onChangeText?: (next: string) => void;
        onSubmitEditing?: () => void;
      };
      const domRef = ReactModule.useRef<HTMLInputElement | null>(null);
      ReactModule.useImperativeHandle(ref, () => ({
        focus: () => domRef.current?.focus(),
        blur: () => domRef.current?.blur(),
        isFocused: () => document.activeElement === domRef.current,
        getText: () => domRef.current?.value ?? "",
        replaceText: (text, selection) => {
          const el = domRef.current;
          if (!el) return;
          el.value = text;
          if (selection) el.setSelectionRange(selection.start, selection.end);
        },
        reset: () => {
          if (domRef.current) domRef.current.value = "";
        },
        getNativeRef: () => domRef.current,
      }));
      adaptiveInputState.latestProps = {
        onChangeText: p.onChangeText,
        onSubmitEditing: p.onSubmitEditing,
      };
      return ReactModule.createElement("input", {
        ref: domRef,
        defaultValue: p.initialValue ?? p.defaultValue ?? "",
        disabled: p.editable === false,
        maxLength: p.maxLength,
        "data-testid": p.testID,
        onChange: (e: { target: { value: string } }) => p.onChangeText?.(e.target.value),
        onKeyDown: (e: { key: string; preventDefault: () => void }) => {
          if (e.key === "Enter") {
            e.preventDefault();
            p.onSubmitEditing?.();
          }
        },
      });
    },
  );
  return { AdaptiveModalSheet, AdaptiveTextInput };
});

vi.mock("@/components/ui/button", async () => {
  const ReactModule = await import("react");
  return {
    Button: ({
      children,
      onPress,
      disabled,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
      testID?: string;
    }) =>
      ReactModule.createElement(
        "button",
        {
          type: "button",
          "data-testid": testID,
          disabled: disabled || undefined,
          onClick: () => !disabled && onPress?.(),
        },
        children,
      ),
  };
});

let root: Root | null = null;
let container: HTMLElement | null = null;

beforeEach(() => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("HTMLElement", dom.window.HTMLElement);
  vi.stubGlobal("HTMLInputElement", dom.window.HTMLInputElement);
  vi.stubGlobal("KeyboardEvent", dom.window.KeyboardEvent);
  vi.stubGlobal("Node", dom.window.Node);
  vi.stubGlobal("navigator", dom.window.navigator);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  adaptiveInputState.latestProps = null;
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  root = null;
  container = null;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

interface RenderOptions {
  visible?: boolean;
  initialValue?: string;
  title?: string;
  placeholder?: string;
  submitLabel?: string;
  onClose?: () => void;
  onSubmit?: (value: string) => Promise<void> | void;
  onGenerate?: () => Promise<string | null>;
  onGenerated?: () => void;
  validate?: (value: string) => string | null;
  maxLength?: number;
}

function renderModal(options: RenderOptions = {}): void {
  const {
    visible = true,
    initialValue = "",
    title = "Rename",
    placeholder,
    submitLabel,
    onClose = vi.fn(),
    onSubmit = vi.fn(),
    onGenerate,
    onGenerated,
    validate,
    maxLength,
  } = options;
  act(() => {
    root?.render(
      <AdaptiveRenameModal
        visible={visible}
        title={title}
        initialValue={initialValue}
        placeholder={placeholder}
        submitLabel={submitLabel}
        onClose={onClose}
        onSubmit={onSubmit}
        onGenerate={onGenerate}
        onGenerated={onGenerated}
        validate={validate}
        maxLength={maxLength}
        testID="rename-modal"
      />,
    );
  });
}

function queryInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('[data-testid="rename-modal-input"]');
}

function querySubmit(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-testid="rename-modal-submit"]');
}

function queryCancel(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-testid="rename-modal-cancel"]');
}

function queryGenerate(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-testid="rename-modal-generate"]');
}

function queryError(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-testid="rename-modal-error"]');
}

function click(element: Element | null): void {
  if (!element) throw new Error("Cannot click null element");
  act(() => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

function typeInto(value: string): void {
  act(() => {
    adaptiveInputState.latestProps?.onChangeText?.(value);
  });
}

function pressEnter(): void {
  act(() => {
    adaptiveInputState.latestProps?.onSubmitEditing?.();
  });
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("RenameModal", () => {
  it("renders with the initial value pre-filled and selects it after open", async () => {
    vi.useFakeTimers();
    renderModal({ initialValue: "main" });
    const input = queryInput();
    expect(input).not.toBeNull();
    expect(input?.value).toBe("main");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const focused = document.activeElement as HTMLInputElement | null;
    expect(focused).toBe(input);
    expect(focused?.selectionStart).toBe(0);
    expect(focused?.selectionEnd).toBe("main".length);
  });

  it("submits on Enter keypress in the input when the value has changed", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderModal({ initialValue: "feature", onSubmit, onClose });

    typeInto("feature-2");
    pressEnter();
    await flush();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("feature-2");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when AdaptiveModalSheet's close prop fires (cancel button / backdrop delegated)", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    renderModal({ initialValue: "main", onClose, onSubmit });

    click(document.querySelector('[data-testid="adaptive-modal-sheet-close"]'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables submit when draft equals initialValue and re-enables after a change", async () => {
    const onSubmit = vi.fn();
    renderModal({ initialValue: "main", onSubmit });

    expect(querySubmit()?.disabled).toBe(true);

    pressEnter();
    await flush();
    expect(onSubmit).not.toHaveBeenCalled();

    typeInto("main-v2");
    await flush();
    expect(querySubmit()?.disabled).toBe(false);

    typeInto("main");
    await flush();
    expect(querySubmit()?.disabled).toBe(true);
  });

  it("surfaces validate errors inline and blocks submission", async () => {
    const onSubmit = vi.fn();
    const validate = vi.fn((value: string) => (value === "bad" ? "Invalid name" : null));
    renderModal({ initialValue: "ok", validate, onSubmit });

    typeInto("bad");
    const submit = querySubmit()!;
    expect(submit.disabled).toBe(true);

    pressEnter();
    await flush();

    expect(onSubmit).not.toHaveBeenCalled();
    const errorNode = queryError();
    expect(errorNode?.textContent).toContain("Invalid name");
  });

  it("disables the submit button while onSubmit is pending", async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    renderModal({ initialValue: "main", onSubmit });

    typeInto("main-renamed");
    click(querySubmit());
    await flush();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(querySubmit()?.disabled).toBe(true);
    expect(queryCancel()?.disabled).toBe(true);

    await act(async () => {
      resolve();
      await Promise.resolve();
    });
  });

  it("keeps the modal open with an error when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Server said no"));
    const onClose = vi.fn();
    renderModal({ initialValue: "main", onSubmit, onClose });

    typeInto("main-renamed");
    click(querySubmit());
    await flush();

    expect(onClose).not.toHaveBeenCalled();
    expect(queryError()?.textContent).toContain("Server said no");
    expect(querySubmit()?.disabled).toBe(false);
  });
});

describe("RenameModal auto-generate", () => {
  it("does not render the generate button when onGenerate is not provided", () => {
    renderModal({ initialValue: "main" });
    expect(queryGenerate()).toBeNull();
  });

  it("fills the input with the generated value and enables submit", async () => {
    const onGenerate = vi.fn(async () => "Fix login flow");
    renderModal({ initialValue: "", onGenerate });

    expect(queryGenerate()).not.toBeNull();
    expect(querySubmit()?.disabled).toBe(true);

    click(queryGenerate());
    await flush();

    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(queryInput()?.value).toBe("Fix login flow");
    expect(querySubmit()?.disabled).toBe(false);
  });

  it("fires onGenerated when a generated title is applied to the input", async () => {
    const onGenerate = vi.fn(async () => "Fix login flow");
    const onGenerated = vi.fn();
    renderModal({ initialValue: "", onGenerate, onGenerated });

    click(queryGenerate());
    await flush();

    expect(queryInput()?.value).toBe("Fix login flow");
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });

  it("does not fire onGenerated when generation yields nothing", async () => {
    const onGenerate = vi.fn(async () => null);
    const onGenerated = vi.fn();
    renderModal({ initialValue: "main", onGenerate, onGenerated });

    click(queryGenerate());
    await flush();

    expect(onGenerated).not.toHaveBeenCalled();
  });

  it("does not fire onGenerated when generation fails", async () => {
    const onGenerate = vi.fn(async () => {
      throw new Error("Generation unavailable");
    });
    const onGenerated = vi.fn();
    renderModal({ initialValue: "main", onGenerate, onGenerated });

    click(queryGenerate());
    await flush();

    expect(onGenerated).not.toHaveBeenCalled();
  });

  it("ignores empty generation results", async () => {
    const onGenerate = vi.fn(async () => null);
    renderModal({ initialValue: "main", onGenerate });

    click(queryGenerate());
    await flush();

    expect(queryInput()?.value).toBe("main");
    expect(queryError()).toBeNull();
  });

  it("surfaces generation errors inline and keeps the modal open", async () => {
    const onClose = vi.fn();
    const onGenerate = vi.fn(async () => {
      throw new Error("Generation unavailable");
    });
    renderModal({ initialValue: "main", onClose, onGenerate });

    click(queryGenerate());
    await flush();

    expect(onClose).not.toHaveBeenCalled();
    expect(queryError()?.textContent).toContain("Generation unavailable");
    expect(queryGenerate()?.disabled).toBe(false);
  });

  it("disables the generate button while generation is pending", async () => {
    let resolveGenerate: (value: string) => void = () => {};
    const onGenerate = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveGenerate = resolve;
        }),
    );
    const onClose = vi.fn();
    renderModal({ initialValue: "main", onGenerate, onClose });

    click(queryGenerate());
    await flush();

    expect(queryGenerate()?.disabled).toBe(true);
    // Closing while generation is pending is allowed.
    expect(queryCancel()?.disabled).toBe(false);

    click(queryCancel());
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      resolveGenerate("Generated title");
    });
    await flush();

    expect(queryGenerate()?.disabled).toBe(false);
    expect(queryInput()?.value).toBe("Generated title");
  });

  it("discards a stale generation result after the modal is closed and reopened", async () => {
    let resolveGenerate: (value: string) => void = () => {};
    const onGenerate = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveGenerate = resolve;
        }),
    );
    renderModal({ initialValue: "main", onGenerate });

    click(queryGenerate());
    await flush();

    // Close and reopen the modal, which bumps the generation epoch.
    renderModal({ visible: false, initialValue: "main", onGenerate });
    renderModal({ visible: true, initialValue: "main", onGenerate });

    await act(async () => {
      resolveGenerate("Generated title");
    });
    await flush();

    // The late result from the previous open is discarded.
    expect(queryInput()?.value).toBe("main");
  });
});

describe("RenameModal epoch race", () => {
  it("late generation must not clear a new generation's loading state", async () => {
    const resolvers: Array<(v: string) => void> = [];
    const onGenerate = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const onClose = vi.fn();
    renderModal({ initialValue: "main", onGenerate, onClose });

    // First generation starts.
    click(queryGenerate());
    await flush();
    expect(queryGenerate()?.disabled).toBe(true);

    // Close and reopen (epoch bumps, loading resets).
    renderModal({ visible: false, initialValue: "main", onGenerate, onClose });
    renderModal({ visible: true, initialValue: "main", onGenerate, onClose });

    // Second generation starts.
    click(queryGenerate());
    await flush();
    expect(queryGenerate()?.disabled).toBe(true);

    // The FIRST generation resolves late — it must not clear the second one's loading.
    await act(async () => {
      resolvers[0]("Old title");
    });
    await flush();
    expect(queryGenerate()?.disabled).toBe(true);

    // Second finishes normally.
    await act(async () => {
      resolvers[1]("New title");
    });
    await flush();
    expect(queryInput()?.value).toBe("New title");
    expect(queryGenerate()?.disabled).toBe(false);
  });
});
