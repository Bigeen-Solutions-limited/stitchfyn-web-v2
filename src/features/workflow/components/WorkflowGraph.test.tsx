import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkflowGraph } from './WorkflowGraph'
import { workflowApi, type GarmentWorkflowResponse } from '../workflow.api'
import { progressPhotoApi, type ProgressPhoto } from '../progress-photo.api'

vi.mock('../workflow.api', () => ({
  workflowApi: {
    getGarmentWorkflow: vi.fn(),
    reportStageCompletion: vi.fn(),
  },
}))

vi.mock('../progress-photo.api', () => ({
  progressPhotoApi: {
    getForGarment: vi.fn(),
    upload: vi.fn(),
  },
  MAX_PROGRESS_PHOTO_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT: 3,
}))

function makeWorkflow(overrides: Partial<GarmentWorkflowResponse> = {}): GarmentWorkflowResponse {
  return {
    instance: { id: 'instance-1', garmentId: 'garment-1', templateVersionId: 'v1' },
    stages: [
      { id: 'stage-cutting', workflowInstanceId: 'instance-1', stageId: 'cutting', status: 'IN_PROGRESS', completedBy: null, completedAt: null, startedAt: null, evidencePhotoUrls: null },
      { id: 'stage-sewing', workflowInstanceId: 'instance-1', stageId: 'sewing', status: 'PENDING', completedBy: null, completedAt: null, startedAt: null, evidencePhotoUrls: null },
    ],
    graphDefinition: {
      nodes: [{ id: 'cutting', name: 'Cutting' }, { id: 'sewing', name: 'Sewing' }],
      edges: [['cutting', 'sewing']],
    },
    ...overrides,
  }
}

function makePhoto(overrides: Partial<ProgressPhoto> = {}): ProgressPhoto {
  return {
    id: 'photo-1', garmentId: 'garment-1', orderId: 'order-1', companyId: 'c1',
    stageInstanceId: 'stage-cutting', stageId: 'cutting',
    cloudinaryPublicId: 'stitchfyn/progress-photos/x', secureUrl: 'https://res.cloudinary.com/mock/x.jpg',
    uploadedBy: 'user-1', uploadedAt: new Date().toISOString(), deviceCapturedAt: null,
    clientId: null, deviceId: null, note: null,
    ...overrides,
  }
}

function renderGraph(garmentId = 'garment-1', orderId = 'order-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkflowGraph garmentId={garmentId} orderId={orderId} />
    </QueryClientProvider>,
  )
}

describe('WorkflowGraph — Staff Progress-Photo Capture UI integration', () => {
  beforeEach(() => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockReset()
    vi.mocked(progressPhotoApi.getForGarment).mockReset()
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([])
  })

  it('1. an active (IN_PROGRESS) stage shows the Add Progress Photo control', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeWorkflow())
    renderGraph()

    expect(await screen.findByText(/CUTTING/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add progress photo/i })).toBeInTheDocument()
  })

  it('2. a completed stage does not show Add Progress Photo, but does show its existing photos', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(
      makeWorkflow({
        stages: [
          { id: 'stage-cutting', workflowInstanceId: 'instance-1', stageId: 'cutting', status: 'COMPLETED', completedBy: 'u1', completedAt: new Date().toISOString(), startedAt: null, evidencePhotoUrls: null },
        ],
      }),
    )
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([makePhoto()])
    renderGraph()

    await screen.findByText(/CUTTING/)
    expect(screen.queryByRole('button', { name: /add progress photo/i })).not.toBeInTheDocument()
    expect(await screen.findByAltText('Progress photo')).toBeInTheDocument()
  })

  it('3 & 4. existing photos render, up to 3, for an active stage', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeWorkflow())
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([
      makePhoto({ id: 'p1' }),
      makePhoto({ id: 'p2' }),
      makePhoto({ id: 'p3' }),
    ])
    renderGraph()

    const thumbnails = await screen.findAllByAltText('Progress photo')
    expect(thumbnails).toHaveLength(3)
  })

  it('does not show progress-photo evidence or capture control for a locked (not-yet-active) stage', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeWorkflow())
    renderGraph()

    await screen.findByText(/CUTTING/)
    // "sewing" is PENDING with an unmet upstream dependency ("cutting" not
    // completed) — locked. No capture control, no evidence section for it.
    expect(screen.getByText(/SEWING/)).toBeInTheDocument()
    // Only one "Add Progress Photo" button exists (cutting's, not sewing's).
    expect(screen.getAllByRole('button', { name: /add progress photo/i })).toHaveLength(1)
  })

  it('10. once a stage already has 3 photos, the capture control is hidden even though the stage is still active', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeWorkflow())
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([
      makePhoto({ id: 'p1' }),
      makePhoto({ id: 'p2' }),
      makePhoto({ id: 'p3' }),
    ])
    renderGraph()

    await screen.findAllByAltText('Progress photo')
    expect(screen.queryByRole('button', { name: /add progress photo/i })).not.toBeInTheDocument()
  })

  it('existing stage-completion behavior (Mark Complete) is unaffected by the progress-photo integration', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeWorkflow())
    renderGraph()

    expect(await screen.findByRole('button', { name: /mark complete/i })).toBeInTheDocument()
  })
})

describe('WorkflowGraph — Mandatory QC/Collection Review Photo Gate', () => {
  beforeEach(() => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockReset()
    vi.mocked(progressPhotoApi.getForGarment).mockReset()
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([])
  })

  function makeQcWorkflow(overrides: Partial<GarmentWorkflowResponse> = {}): GarmentWorkflowResponse {
    return makeWorkflow({
      stages: [
        { id: 'stage-qc', workflowInstanceId: 'instance-1', stageId: 'qc', status: 'IN_PROGRESS', completedBy: null, completedAt: null, startedAt: null, evidencePhotoUrls: null },
      ],
      graphDefinition: {
        nodes: [{ id: 'qc', name: 'Quality Check' }],
        edges: [],
      },
      ...overrides,
    })
  }

  it('1. the active qc stage with no photo shows Add Progress Photo but disables Mark Complete', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeQcWorkflow())
    renderGraph()

    expect(await screen.findByRole('button', { name: /add progress photo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeDisabled()
    expect(screen.getByText(/add at least one progress photo before completing this stage/i)).toBeInTheDocument()
  })

  it('2. once a progress photo exists for the qc stage, Mark Complete becomes available', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeQcWorkflow())
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([
      makePhoto({ stageId: 'qc', stageInstanceId: 'stage-qc' }),
    ])
    renderGraph()

    await screen.findByRole('button', { name: /mark complete/i })
    expect(screen.getByRole('button', { name: /mark complete/i })).not.toBeDisabled()
    expect(screen.queryByText(/add at least one progress photo before completing this stage/i)).not.toBeInTheDocument()
  })

  it('3. a photo captured earlier on the qc stage satisfies the gate immediately, with no extra action', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeQcWorkflow())
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([
      makePhoto({ id: 'earlier-photo', stageId: 'qc', stageInstanceId: 'stage-qc' }),
    ])
    renderGraph()

    expect(await screen.findByRole('button', { name: /mark complete/i })).not.toBeDisabled()
  })

  it('4. a photo belonging to a DIFFERENT stage does not incorrectly enable qc completion', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeQcWorkflow())
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([
      makePhoto({ id: 'wrong-stage-photo', stageId: 'finishing', stageInstanceId: 'stage-finishing' }),
    ])
    renderGraph()

    expect(await screen.findByRole('button', { name: /mark complete/i })).toBeDisabled()
  })

  it('5. a normal production stage (not qc) remains completable with zero photos', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(makeWorkflow())
    renderGraph()

    expect(await screen.findByRole('button', { name: /mark complete/i })).not.toBeDisabled()
  })

  it('6. a completed qc stage retains its photos and shows no capture control or Mark Complete button', async () => {
    vi.mocked(workflowApi.getGarmentWorkflow).mockResolvedValue(
      makeQcWorkflow({
        stages: [
          { id: 'stage-qc', workflowInstanceId: 'instance-1', stageId: 'qc', status: 'COMPLETED', completedBy: 'u1', completedAt: new Date().toISOString(), startedAt: null, evidencePhotoUrls: null },
        ],
      }),
    )
    vi.mocked(progressPhotoApi.getForGarment).mockResolvedValue([
      makePhoto({ stageId: 'qc', stageInstanceId: 'stage-qc' }),
    ])
    renderGraph()

    expect(await screen.findByAltText('Progress photo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add progress photo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument()
  })
})
