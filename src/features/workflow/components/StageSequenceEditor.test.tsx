import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StageSequenceEditor } from './StageSequenceEditor'
import type { WorkflowTemplate } from '../workflow.api'

const saveOrder = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }
vi.mock('../hooks/useWorkflowTemplates', () => ({
  useSaveStageOrder: () => saveOrder,
  useDuplicateTemplate: () => ({ mutate: vi.fn(), isPending: false }),
}))

function template(companyId: string | null, hours?: number): WorkflowTemplate {
  const ids = ['cutting', 'sewing', 'collection']
  return {
    id: 'tpl-1',
    companyId,
    name: 'Agbada',
    requiredMeasurements: [],
    createdAt: '2026-10-22',
    versions: [{
      id: 'v1', templateId: 'tpl-1', versionNumber: 1, createdAt: '2026-10-22',
      graphDefinition: {
        nodes: ids.map((id) => ({ id, name: id, estimatedDurationHours: hours })),
        edges: [['cutting', 'sewing'], ['sewing', 'collection']],
      },
    }],
  }
}

describe('StageSequenceEditor hours', () => {
  beforeEach(() => saveOrder.mutateAsync.mockClear())

  it('warns when no stage has hours, and saves the hours typed', async () => {
    render(<StageSequenceEditor template={template('company-1')} />)
    expect(screen.getByText(/add hours to each stage/i)).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Hours for sewing'), { target: { value: '8.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const { graph } = saveOrder.mutateAsync.mock.calls[0][0]
    expect(graph.nodes.find((n: { id: string }) => n.id === 'sewing').estimatedDurationHours).toBe(8.5)
    expect(graph.edges).toEqual([['cutting', 'sewing'], ['sewing', 'collection']])
  })

  it('refuses more than 240 hours for a stage', () => {
    render(<StageSequenceEditor template={template('company-1', 2)} />)
    fireEvent.change(screen.getByLabelText('Hours for cutting'), { target: { value: '300' } })

    expect(screen.getByText(/at most 240 hours/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows hours read-only on a system template', () => {
    render(<StageSequenceEditor template={template(null, 4)} />)
    expect(screen.queryByLabelText('Hours for cutting')).toBeNull()
    expect(screen.getAllByText('4h')).toHaveLength(3)
    expect(screen.queryByText(/add hours to each stage/i)).toBeNull()
  })
})
