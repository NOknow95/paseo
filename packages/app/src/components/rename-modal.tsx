import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react-native";
import {
  AdaptiveModalSheet,
  AdaptiveTextInput,
  type SheetHeader,
} from "@/components/adaptive-modal-sheet";
import { Button } from "@/components/ui/button";
import type { EditingTextInputHandle } from "@/components/ui/text-input";

export interface AdaptiveRenameModalProps {
  visible: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void> | void;
  /**
   * When provided, a generate button is shown. It should return the generated
   * value, which fills the input so the user can review it before submitting.
   */
  onGenerate?: () => Promise<string | null>;
  /**
   * Called once a generated title has been applied to the input, so the host
   * can acknowledge the action (e.g. with a success toast).
   */
  onGenerated?: () => void;
  validate?: (value: string) => string | null;
  maxLength?: number;
  testID?: string;
}

export function AdaptiveRenameModal({
  visible,
  title,
  initialValue,
  placeholder,
  submitLabel,
  onClose,
  onSubmit,
  onGenerate,
  onGenerated,
  validate,
  maxLength,
  testID,
}: AdaptiveRenameModalProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef<EditingTextInputHandle>(null);
  // Bumped every time the modal opens so a late generation result from a
  // previous open is discarded instead of polluting the fresh modal.
  const generationEpoch = useRef(0);

  useEffect(() => {
    if (!visible) return;
    generationEpoch.current += 1;
    setDraft(initialValue);
    setError(null);
    setIsPending(false);
    setIsGenerating(false);
  }, [visible, initialValue]);

  useEffect(() => {
    if (!visible) return;
    const length = initialValue.length;
    const timeout = setTimeout(() => {
      const node = inputRef.current;
      if (!node) return;
      node.focus();
      if (length > 0) {
        node.replaceText(node.getText(), { start: 0, end: length });
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, [visible, initialValue]);

  const computeError = useCallback(
    (value: string): string | null => {
      if (!value.trim()) return t("common.errors.nameRequired");
      return validate ? validate(value) : null;
    },
    [validate, t],
  );

  const handleChange = useCallback((value: string) => {
    setDraft(value);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isPending) return;
    const value = draft;
    if (value === initialValue) return;
    const validationError = computeError(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setIsPending(true);
      await onSubmit(value);
      setIsPending(false);
      onClose();
    } catch (err) {
      setIsPending(false);
      const message =
        err instanceof Error && err.message ? err.message : t("common.errors.unableToSave");
      setError(message);
    }
  }, [isPending, draft, initialValue, computeError, onSubmit, onClose, t]);

  const handleCancel = useCallback(() => {
    if (isPending) return;
    onClose();
  }, [isPending, onClose]);

  const handleGenerate = useCallback(async () => {
    if (!onGenerate || isPending || isGenerating) return;
    const epoch = generationEpoch.current;
    try {
      setIsGenerating(true);
      setError(null);
      const generated = await onGenerate();
      if (epoch !== generationEpoch.current) return;
      if (generated && generated.trim()) {
        const value = generated.trim();
        setDraft(value);
        setError(null);
        // The input is uncontrolled (native-owned text), so programmatic text
        // must be pushed through the imperative handle, not just the draft state.
        const node = inputRef.current;
        if (node) {
          node.replaceText(value, { start: 0, end: value.length });
        }
        onGenerated?.();
      }
    } catch (err) {
      if (epoch !== generationEpoch.current) return;
      const message =
        err instanceof Error && err.message ? err.message : t("renameModal.generateFailed");
      setError(message);
    } finally {
      // Epoch-guarded like the result paths: a late generation from a
      // previous open must not clear the loading state of the current one.
      if (epoch === generationEpoch.current) {
        setIsGenerating(false);
      }
    }
  }, [onGenerate, onGenerated, isPending, isGenerating, t]);

  const handleGenerateVoid = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

  const handleSubmitVoid = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  const submitDisabled =
    isPending || isGenerating || draft === initialValue || computeError(draft) !== null;
  const inputTestID = testID ? `${testID}-input` : undefined;
  const errorTestID = testID ? `${testID}-error` : undefined;
  const submitTestID = testID ? `${testID}-submit` : undefined;
  const cancelTestID = testID ? `${testID}-cancel` : undefined;
  const generateTestID = testID ? `${testID}-generate` : undefined;
  const sheetHeader = useMemo<SheetHeader>(() => ({ title }), [title]);

  return (
    <AdaptiveModalSheet
      visible={visible}
      onClose={handleCancel}
      header={sheetHeader}
      testID={testID}
    >
      <View style={styles.body}>
        <AdaptiveTextInput
          ref={inputRef}
          initialValue={initialValue}
          onChangeText={handleChange}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isPending && !isGenerating}
          maxLength={maxLength}
          onSubmitEditing={handleSubmitVoid}
          style={styles.input}
          testID={inputTestID}
        />
        {error ? (
          <Text style={styles.errorText} testID={errorTestID}>
            {error}
          </Text>
        ) : null}
        {onGenerate ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Sparkles}
            loading={isGenerating}
            onPress={handleGenerateVoid}
            disabled={isPending || isGenerating}
            testID={generateTestID}
          >
            {isGenerating ? t("renameModal.generating") : t("renameModal.generate")}
          </Button>
        ) : null}
        <View style={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            style={styles.actionButton}
            onPress={handleCancel}
            disabled={isPending}
            testID={cancelTestID}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button
            variant="default"
            size="sm"
            style={styles.actionButton}
            onPress={handleSubmitVoid}
            disabled={submitDisabled}
            testID={submitTestID}
          >
            {isPending ? t("renameModal.saving") : (submitLabel ?? t("renameModal.rename"))}
          </Button>
        </View>
      </View>
    </AdaptiveModalSheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: {
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  input: {
    backgroundColor: theme.colors.surface0,
    color: theme.colors.foreground,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSize.base,
  },
  errorText: {
    color: theme.colors.palette.red[300],
    fontSize: theme.fontSize.base,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  actionButton: {
    flex: 1,
  },
}));
