import { useQuery, useMutation } from "@tanstack/react-query"
import { workflowApi } from "../workflow.api"
import { progressPhotoApi } from "../progress-photo.api"
import { keys } from "../../../query/keys"
import { queryClient } from "../../../query/queryClient"
import { useToastStore } from "../../../components/feedback/Toast"
import { useDomainError } from "../../../lib/errors"
import { getDeviceId } from "../../../lib/device-id"

export function useGarmentWorkflow(garmentId: string) {
  return useQuery({
    queryKey: keys.workflow.garment(garmentId),
    queryFn: () => workflowApi.getGarmentWorkflow(garmentId),
    enabled: !!garmentId,
  })
}

export function useReportStageCompletion(garmentId: string, orderId?: string) {
  const showToast = useToastStore((state) => state.showToast)
  const { handleError } = useDomainError()

  return useMutation({
    mutationFn: (params: { stageId: string; evidencePhotoUrls?: string[] }) =>
      workflowApi.reportStageCompletion({ garmentId, ...params }),
    onSuccess: () => {
      // PURE REFRESH
      queryClient.invalidateQueries({
        queryKey: keys.workflow.garment(garmentId),
      })
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: keys.orders.detail(orderId) })
        queryClient.invalidateQueries({
          queryKey: keys.orders.garments(orderId),
        })
      }
      queryClient.invalidateQueries({ queryKey: keys.orders.all })
      queryClient.invalidateQueries({ queryKey: keys.analytics.overview })
      queryClient.invalidateQueries({ queryKey: keys.workflow.activeTasks })

      showToast("Action Successful", "Information updated.")
    },
    onError: (err: any) => {
      handleError(err)
    },
  })
}

export function useWorkflow(orderId: string) {
  return useGarmentWorkflow(orderId)
}

export function useCompleteStage(orderId: string) {
  const mutation = useReportStageCompletion(orderId)

  return {
    ...mutation,
    mutate: (stageId: string) => mutation.mutate({ stageId }),
    mutateAsync: (stageId: string) => mutation.mutateAsync({ stageId }),
  }
}

/**
 * Staff Progress-Photo Capture UI.
 *
 * Server-authoritative by design — no optimistic photo entry is ever added
 * locally; the UI only ever renders what this query returns, refetched
 * after a successful upload.
 */
export function useProgressPhotos(garmentId: string) {
  return useQuery({
    queryKey: keys.workflow.progressPhotos(garmentId),
    queryFn: () => progressPhotoApi.getForGarment(garmentId),
    enabled: !!garmentId,
  })
}

export function useUploadProgressPhoto(garmentId: string) {
  const showToast = useToastStore((state) => state.showToast)
  const { handleError } = useDomainError()

  return useMutation({
    mutationFn: ({ stageId, file, note }: { stageId: string; file: File; note?: string }) =>
      progressPhotoApi.upload(garmentId, stageId, file, note, {
        // Generated fresh per capture — makes even this fully-online path
        // idempotent against a double-tap/retry, the same convention
        // established for fabric evidence. Not offline queueing: nothing
        // here persists across a reload or retries after a page leave.
        clientId: crypto.randomUUID(),
        deviceId: getDeviceId(),
        deviceCapturedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      // PURE REFRESH — progress photos live in their own table, untouched
      // by stage completion, so only this query needs invalidating (not
      // keys.workflow.garment, which reflects stage state, not photos).
      queryClient.invalidateQueries({ queryKey: keys.workflow.progressPhotos(garmentId) })
      showToast("Photo Added", "Progress photo uploaded.")
    },
    onError: (err: any) => {
      handleError(err)
    },
  })
}

export function useUpdateGarmentStage(garmentId: string) {
  const showToast = useToastStore((state) => state.showToast);
  const { handleError } = useDomainError();

  return useMutation({
    mutationFn: (params: { stageId: string; assignedTailorId: string | null }) =>
      workflowApi.updateGarmentStage(garmentId, params),
    onSuccess: () => {
      // PURE REFRESH
      queryClient.invalidateQueries({ queryKey: keys.workflow.activeTasks });
      queryClient.invalidateQueries({ queryKey: keys.workflow.garment(garmentId) });
      queryClient.invalidateQueries({ queryKey: keys.orders.all });
      queryClient.invalidateQueries({ queryKey: keys.analytics.overview });

      showToast("Garment Updated", "Stage and tailor assignment synchronized.");
    },
    onError: (err: any) => {
      handleError(err);
    },
  });
}
