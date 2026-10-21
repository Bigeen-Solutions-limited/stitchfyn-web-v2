// Reordering a template's stages. Only straight-line templates can be reordered here: a template with parallel
// branches would lose its shape if flattened into a list, so those are left alone.

import type { WorkflowGraph, WorkflowNode, WorkflowTemplate } from './workflow.api';

// Their gates (photo, fitting, collection) are tied to these ids, so the server enforces where they sit
const QC_STAGE_ID = 'qc';
const COLLECTION_STAGE_ID = 'collection';

export function latestGraph(template: WorkflowTemplate): WorkflowGraph | null {
  const latest = [...(template.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)[0];
  return latest?.graphDefinition ?? null;
}

// The stages in running order when the graph is one straight line, otherwise null
export function linearOrder(graph: WorkflowGraph | null): WorkflowNode[] | null {
  if (!graph || graph.nodes.length === 0) return null;
  const edges = graph.edges ?? [];
  if (edges.length !== graph.nodes.length - 1) return null;

  const next = new Map<string, string>();
  const incoming = new Set<string>();
  for (const [from, to] of edges) {
    if (next.has(from) || incoming.has(to)) return null;
    next.set(from, to);
    incoming.add(to);
  }

  const starts = graph.nodes.filter((n) => !incoming.has(n.id));
  if (starts.length !== 1) return null;

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const ordered: WorkflowNode[] = [];
  for (let id: string | undefined = starts[0].id; id; id = next.get(id)) {
    const node = byId.get(id);
    if (!node || ordered.includes(node)) return null;
    ordered.push(node);
  }
  return ordered.length === graph.nodes.length ? ordered : null;
}

export function moveStage(nodes: WorkflowNode[], index: number, direction: -1 | 1): WorkflowNode[] {
  const target = index + direction;
  if (target < 0 || target >= nodes.length) return nodes;
  const moved = [...nodes];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

// Why this order can't be saved, or null when it can (the server checks the same rules)
export function orderProblem(nodes: WorkflowNode[]): string | null {
  const collection = nodes.findIndex((n) => n.id === COLLECTION_STAGE_ID);
  if (collection !== -1 && collection !== nodes.length - 1) {
    return "'Ready for Collection' must stay the last stage.";
  }
  const qc = nodes.findIndex((n) => n.id === QC_STAGE_ID);
  if (qc !== -1 && collection !== -1 && qc > collection) {
    return "'Quality Check' must come before 'Ready for Collection'.";
  }
  return null;
}

// A straight line through the stages in the given order
export function chainGraph(nodes: WorkflowNode[]): WorkflowGraph {
  return {
    nodes,
    edges: nodes.slice(1).map((node, i) => [nodes[i].id, node.id] as [string, string]),
  };
}

export const isSystemTemplate = (template: WorkflowTemplate): boolean => !template.companyId;
