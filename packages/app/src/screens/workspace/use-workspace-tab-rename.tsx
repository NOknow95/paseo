import { useCallback, useState } from "react";
import { type QueryClient } from "@tanstack/react-query";
import {
  AgentTitleGenerateRejectedError,
  AgentTitleGenerateTimeoutError,
  type DaemonClient,
} from "@getpaseo/client/internal/daemon-client";
import type { ListTerminalsResponse } from "@getpaseo/protocol/messages";
import { useTranslation } from "react-i18next";
import { AdaptiveRenameModal } from "@/components/rename-modal";
import { useToast } from "@/contexts/toast-context";
import { useSessionStore } from "@/stores/session-store";
import type { WorkspaceTabDescriptor } from "@/screens/workspace/workspace-tabs-types";

interface RenamingTabState {
  kind: "terminal" | "agent";
  id: string;
  currentTitle: string;
}

interface UseWorkspaceTabRenameInput {
  client: DaemonClient | null;
  normalizedServerId: string;
  queryClient: QueryClient;
  terminalsData: ListTerminalsResponse["payload"] | undefined;
  terminalsQueryKey: readonly unknown[];
}

interface UseWorkspaceTabRenameResult {
  renamingTab: RenamingTabState | null;
  handleRenameTab: (tab: WorkspaceTabDescriptor) => void;
  handleRenameModalSubmit: (nextTitle: string) => Promise<void>;
  handleRenameModalClose: () => void;
  handleRenameModalGenerate: (() => Promise<string | null>) | null;
}

export function useWorkspaceTabRename(
  input: UseWorkspaceTabRenameInput,
): UseWorkspaceTabRenameResult {
  const { client, normalizedServerId, queryClient, terminalsData, terminalsQueryKey } = input;
  const { t, i18n } = useTranslation();
  const [renamingTab, setRenamingTab] = useState<RenamingTabState | null>(null);
  // COMPAT(agentTitleGenerate): added in v0.6.1, remove gate after 2027-09-01.
  const supportsAgentTitleGenerate = useSessionStore(
    (s) => s.sessions[normalizedServerId]?.serverInfo?.features?.agentTitleGenerate === true,
  );

  const handleRenameTab = useCallback(
    (tab: WorkspaceTabDescriptor) => {
      if (tab.target.kind === "terminal") {
        const { terminalId } = tab.target;
        const terminal = terminalsData?.terminals.find((entry) => entry.id === terminalId) ?? null;
        const currentTitle = terminal?.title ?? terminal?.name ?? "";
        setRenamingTab({ kind: "terminal", id: terminalId, currentTitle });
        return;
      }
      if (tab.target.kind === "agent") {
        const { agentId } = tab.target;
        const agent =
          useSessionStore.getState().sessions[normalizedServerId]?.agents?.get(agentId) ?? null;
        const currentTitle = agent?.title ?? "";
        setRenamingTab({ kind: "agent", id: agentId, currentTitle });
      }
    },
    [normalizedServerId, terminalsData],
  );

  const handleRenameModalSubmit = useCallback(
    async (nextTitle: string) => {
      if (!renamingTab) return;
      if (!client) {
        throw new Error(t("workspace.terminal.hostDisconnected"));
      }
      const trimmed = nextTitle.trim();
      if (renamingTab.kind === "terminal") {
        const result = await client.renameTerminal({
          terminalId: renamingTab.id,
          title: trimmed,
        });
        if (!result.success) {
          throw new Error(result.error ?? "Failed to rename terminal");
        }
        void queryClient.invalidateQueries({ queryKey: terminalsQueryKey });
        return;
      }
      await client.updateAgent(renamingTab.id, { name: trimmed });
      void queryClient.invalidateQueries({
        queryKey: ["sidebarAgentsList", normalizedServerId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["allAgents", normalizedServerId],
      });
    },
    [client, normalizedServerId, queryClient, renamingTab, terminalsQueryKey, t],
  );

  const handleRenameModalClose = useCallback(() => {
    setRenamingTab(null);
  }, []);

  const handleRenameModalGenerate = useCallback(async (): Promise<string | null> => {
    if (!renamingTab || renamingTab.kind !== "agent") return null;
    if (!client) {
      throw new Error(t("workspace.terminal.hostDisconnected"));
    }
    try {
      const { title } = await client.generateAgentTitle(renamingTab.id, {
        // The generated title should follow the app's current UI language.
        language: i18n.language ?? undefined,
      });
      return title;
    } catch (error) {
      if (error instanceof AgentTitleGenerateTimeoutError) {
        throw new Error(t("renameModal.generateTimeout"), { cause: error });
      }
      if (error instanceof AgentTitleGenerateRejectedError) {
        throw new Error(t("renameModal.generateRejected"), { cause: error });
      }
      throw error;
    }
  }, [client, renamingTab, t, i18n.language]);

  return {
    renamingTab,
    handleRenameTab,
    handleRenameModalSubmit,
    handleRenameModalClose,
    handleRenameModalGenerate:
      supportsAgentTitleGenerate && renamingTab?.kind === "agent"
        ? handleRenameModalGenerate
        : null,
  };
}

export interface WorkspaceTabRenameModalProps {
  renamingTab: RenamingTabState | null;
  onClose: () => void;
  onSubmit: (nextTitle: string) => Promise<void>;
  onGenerate?: (() => Promise<string | null>) | null;
}

export function WorkspaceTabRenameModal({
  renamingTab,
  onClose,
  onSubmit,
  onGenerate,
}: WorkspaceTabRenameModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const title =
    renamingTab?.kind === "terminal"
      ? t("workspace.tabs.menu.renameTerminal")
      : t("workspace.tabs.menu.renameAgent");
  const initialValue = renamingTab?.currentTitle ?? "";
  const testID = renamingTab
    ? `workspace-tab-rename-modal-${renamingTab.kind}-${renamingTab.id}`
    : undefined;
  // Stable so the generate path in the modal isn't recreated every render.
  const handleGenerated = useCallback(() => {
    toast.show(t("renameModal.generateSuccess"), { variant: "success" });
  }, [toast, t]);
  return (
    <AdaptiveRenameModal
      visible={renamingTab !== null}
      title={title}
      initialValue={initialValue}
      submitLabel={t("workspace.tabs.menu.rename")}
      maxLength={200}
      onClose={onClose}
      onSubmit={onSubmit}
      onGenerate={onGenerate ?? undefined}
      onGenerated={handleGenerated}
      testID={testID}
    />
  );
}
