import { apiClient } from '../../infrastructure/http/axios.client';

export interface WorkflowTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  requiredMeasurements: string[];
  createdAt: string;
  versions?: WorkflowTemplateVersion[];
}

export interface WorkflowTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  graphDefinition: WorkflowGraph;
  activeGarments?: number;
  createdAt: string;
}

export interface StageInstance {
  id: string;
  workflowInstanceId: string;
  stageId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'INHIBITED' | 'COMPLETED' | 'BLOCKED';
  completedBy: string | null;
  completedAt: string | null;
  startedAt: string | null;
  reasonCode?: string | null;
  evidencePhotoUrls: string[] | null;
}

export interface WorkflowInstance {
  id: string;
  garmentId: string;
  templateVersionId: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  estimated_duration_hours?: number;
}

export type WorkflowEdge = [string, string]; // [from stage, to stage]

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface GarmentWorkflowResponse {
  instance: WorkflowInstance;
  stages: StageInstance[];
  graphDefinition: WorkflowGraph;
}

export interface ActiveFloorTask {
  stageInstanceId: string;
  stageId: string;
  stageName: string;
  garmentId: string;
  garmentName: string;
  assignedTailorId?: string | null;
  tailorEmail?: string | null;
  orderId: string;
  orderNumber: number;
  customerName: string;
  deadline: string;
  riskLevel: 'ON_TRACK' | 'AT_RISK' | 'OVERDUE';
  fabricName?: string;
  fabric_image_base64?: string;
  startDate?: string;
  startedAt?: string;
  storeId?: string;
  status: string;
}

export const workflowApi = {
  getGarmentWorkflow: async (garmentId: string) => {
    const { data } = await apiClient.get<GarmentWorkflowResponse>(`/workflows/garments/${garmentId}/workflow`);
    return data;
  },
  
  reportStageCompletion: async (params: { garmentId: string; stageId: string; evidencePhotoUrls?: string[] }) => {
    const { data } = await apiClient.post('/workflows/stages/complete', params);
    return data;
  },

  getTemplates: async () => {
    const { data } = await apiClient.get<WorkflowTemplate[]>('/workflows/templates');
    return data;
  },

  createTemplate: async (name: string, description?: string) => {
    const { data } = await apiClient.post<WorkflowTemplate>('/workflows/templates', { name, description });
    return data;
  },

  getTemplateStages: async (templateId: string) => {
    const { data } = await apiClient.get<WorkflowNode[]>(`/workflows/templates/${templateId}/stages`);
    return data;
  },

  addTemplateStage: async (templateId: string, name: string, estimatedDuration: number) => {
    const { data } = await apiClient.post(`/workflows/templates/${templateId}/stages`, {
      name,
      estimated_duration_hours: estimatedDuration
    });
    return data;
  },

  getActiveTasks: async (): Promise<ActiveFloorTask[]> => {
    const { data } = await apiClient.get<ActiveFloorTask[]>('/workflows/tasks/active');
    return data;
  },

  updateTemplateMeasurements: async (templateId: string, measurements: string[]) => {
    const { data } = await apiClient.put(`/workflows/templates/${templateId}/measurements`, {
      measurements
    });
    return data;
  }
};
