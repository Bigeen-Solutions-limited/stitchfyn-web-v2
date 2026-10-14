import { useQuery, useMutation } from "@tanstack/react-query"
import { workflowApi } from "../workflow.api"
import { progressPhotoApi } from "../progress-photo.api"
import { keys } from "../../../query/keys"
import { queryClient } from "../../../query/queryClient"
import { useToastStore } from "../../../components/feedback/Toast"
import { useDomainError } from "../../../lib/errors"
import { getDeviceId } from "../../../lib/device-id"
import { enqueueStageUpdate, isNetworkFailure } from "../offline/stage-update-queue"

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
    // If the request can't reach the server, queue it to sync later instead of losing it
    mutationFn: async (params: { stageId: string; evidencePhotoUrls?: string[] }) => {
      const queue = () => enqueueStageUpdate({ garmentId, orderId, ...params }).then(() => ({ queued: true as const }))
      if (typeof navigator !== "undefined" && navigator.onLine === false) return queue()
      try {
        return await workflowApi.reportStageCompletion({ garmentId, ...params })
      } catch (err) {
        if (isNetworkFailure(err)) return queue()
        throw err
      }
    },
    onSuccess: (result) => {
      if (result && typeof result === "object" && "queued" in result) {
        showToast("Saved offline", "This stage update will sync when you're back online.")
        return
      }
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
      // The server refused (e.g. a required photo is missing), so refetch the real state
      queryClient.invalidateQueries({ queryKey: keys.workflow.garment(garmentId) })
      queryClient.invalidateQueries({ queryKey: keys.workflow.progressPhotos(garmentId) })
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

// Shows only what the server returns; nothing is added locally before upload
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
        // New key per photo, so a double tap or retry isn't saved twice
        clientId: crypto.randomUUID(),
        deviceId: getDeviceId(),
        deviceCapturedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      // Photos are stored separately from stage state, so only this list needs refreshing
      queryClient.invalidateQueries({ queryKey: keys.workflow.progressPhotos(garmentId) })
      showToast("Photo Added", "Progress photo uploaded.")
    },
    onError: (err: any) => {
      handleError(err)
    },
  })
}
