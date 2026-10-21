import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowApi } from "../workflow.api";
import { keys } from "../../../query/keys";
import { useToastStore } from "../../../components/feedback/Toast";
import type { WorkflowGraph } from "../workflow.api";

// The server's message explains refusals (e.g. a system template, or a stage order it won't accept)
const serverMessage = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.message || fallback;

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: keys.workflow.templates,
    queryFn: () => workflowApi.getTemplates(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTemplateStages(templateId: string | undefined) {
  return useQuery({
    queryKey: ['workflow', 'template-stages', templateId],
    queryFn: () => workflowApi.getTemplateStages(templateId!),
    enabled: !!templateId,
  });
}

export function useAddTemplateStage() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ templateId, name, duration }: { templateId: string; name: string; duration: number }) =>
      workflowApi.addTemplateStage(templateId, name, duration),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', 'template-stages', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: keys.workflow.templates });
      showToast('Stage Added', 'Workflow blueprint has been updated.', 'success');
    },
    onError: (error: any) => {
      showToast('Error', serverMessage(error, 'Failed to add stage'), 'error');
    }
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      workflowApi.createTemplate(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.workflow.templates });
      showToast('Template Created', 'New workflow blueprint has been registered.', 'success');
    },
    onError: (error: any) => {
      showToast('Error', serverMessage(error, 'Failed to create template'), 'error');
    }
  });
}
export function useUpdateTemplateMeasurements() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ templateId, measurements }: { templateId: string; measurements: string[] }) =>
      workflowApi.updateTemplateMeasurements(templateId, measurements),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.workflow.templates });
      showToast('Measurements Updated', 'Template measurement requirements have been synchronized.', 'success');
    },
    onError: (error: any) => {
      showToast('Error', serverMessage(error, 'Failed to update measurements'), 'error');
    }
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name?: string }) =>
      workflowApi.duplicateTemplate(templateId, name),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: keys.workflow.templates });
      showToast('Template Duplicated', `"${template.name}" is yours to edit.`, 'success');
    },
    onError: (error: any) => {
      showToast('Error', serverMessage(error, 'Failed to duplicate template'), 'error');
    }
  });
}

export function useSaveStageOrder() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ templateId, graph }: { templateId: string; graph: WorkflowGraph }) =>
      workflowApi.saveTemplateGraph(templateId, graph),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', 'template-stages', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: keys.workflow.templates });
      showToast('Template Saved', 'New orders use these stages and hours; garments already in production keep theirs.', 'success');
    },
    onError: (error: any) => {
      showToast('Error', serverMessage(error, 'Failed to save stage order'), 'error');
    }
  });
}
