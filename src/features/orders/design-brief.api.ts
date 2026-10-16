import { apiClient } from '../../infrastructure/http/axios.client';

export type BriefType = 'basic' | 'technical';

export interface SectionVersion {
  versionNumber: number;
  content: { label: string; notes: string; [key: string]: unknown };
  appendedAt: string | null;
}

export interface DesignBrief {
  id: string;
  garmentId: string;
  orderId: string;
  briefType: BriefType;
  silhouette: string | null;
  neckline: string | null;
  waistDetail: string | null;
  backFinish: string | null;
  additionalNotes: string | null;
  referenceImageIds: string[];
  confirmedByCustomerAt: string | null; // set when the customer confirms in the portal
  confirmedChannel: 'portal' | 'sms_reply' | 'in_person' | null;
  sectionVersions: SectionVersion[];
  createdAt: string | null;
}

export interface CreateBriefBody {
  brief_type: BriefType;
  silhouette?: string;
  neckline?: string;
  waist_detail?: string;
  back_finish?: string;
  additional_notes?: string;
  reference_image_ids?: string[];
}

export const designBriefApi = {
  getBrief: async (orderId: string, garmentId: string): Promise<DesignBrief> => {
    const { data } = await apiClient.get<DesignBrief>(
      `/orders/${orderId}/garments/${garmentId}/design-brief`,
    );
    return data;
  },

  createBrief: async (
    orderId: string,
    garmentId: string,
    body: CreateBriefBody,
  ): Promise<DesignBrief> => {
    const { data } = await apiClient.post<DesignBrief>(
      `/orders/${orderId}/garments/${garmentId}/design-brief`,
      body,
    );
    return data;
  },

  addSection: async (
    orderId: string,
    garmentId: string,
    content: { label: string; notes: string },
  ): Promise<DesignBrief> => {
    const { data } = await apiClient.post<DesignBrief>(
      `/orders/${orderId}/garments/${garmentId}/design-brief/sections`,
      { content },
    );
    return data;
  },
};

export const portalDesignBriefApi = {
  confirm: async (portalToken: string, briefId: string): Promise<DesignBrief> => {
    const { data } = await apiClient.post<DesignBrief>(
      `/portal/orders/${portalToken}/design-briefs/${briefId}/confirm`,
      { channel: 'portal' },
    );
    return data;
  },
};
