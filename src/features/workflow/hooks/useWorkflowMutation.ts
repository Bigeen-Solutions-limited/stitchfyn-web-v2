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
    // LR-5: offline (or the request never reaches the server) → queue it
    // for /sync/batch instead of losing the tailor's update.
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
      // A rejected completion (e.g. 409 PROGRESS_PHOTO_REQUIRED from the
      // QC/Collection Review Photo Gate) leaves the stage incomplete on
      // the server — refetch so a stale client's view (workflow status,
      // progress-photo count) re-syncs to the true state rather than
      // continuing to show whatever it optimistically assumed.
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
