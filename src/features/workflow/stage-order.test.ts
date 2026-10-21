import { describe, it, expect } from 'vitest';
import { chainGraph, latestGraph, linearOrder, moveStage, orderProblem } from './stage-order';
import type { WorkflowGraph, WorkflowTemplate } from './workflow.api';

const node = (id: string) => ({ id, name: id });
const line: WorkflowGraph = {
  nodes: ['cutting', 'intake', 'qc', 'sewing', 'collection'].map(node), // stored out of running order on purpose
  edges: [['intake', 'cutting'], ['cutting', 'sewing'], ['sewing', 'qc'], ['qc', 'collection']],
};
const ids = (nodes: { id: string }[] | null) => nodes?.map((n) => n.id);

describe('stage order', () => {
  it('reads a straight-line template in running order, whatever order the nodes are stored in', () => {
    expect(ids(linearOrder(line))).toEqual(['intake', 'cutting', 'sewing', 'qc', 'collection']);
  });

  it('refuses to flatten a template with parallel stages', () => {
    const branching: WorkflowGraph = {
      nodes: ['a', 'b', 'c', 'd'].map(node),
      edges: [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']],
    };
    expect(linearOrder(branching)).toBeNull();
  });

  it('moves a stage one place and ignores moves off either end', () => {
    const order = linearOrder(line)!;
    expect(ids(moveStage(order, 2, -1))).toEqual(['intake', 'sewing', 'cutting', 'qc', 'collection']);
    expect(moveStage(order, 0, -1)).toBe(order);
    expect(moveStage(order, 4, 1)).toBe(order);
  });

  it('keeps collection last and quality check before it', () => {
    const order = linearOrder(line)!;
    expect(orderProblem(order)).toBeNull();
    expect(orderProblem(moveStage(order, 4, -1))).toMatch(/last stage/);
    expect(orderProblem(['intake', 'collection', 'qc'].map(node))).toMatch(/last stage/);
  });

  it('chains stages into a straight line', () => {
    expect(chainGraph(['a', 'b', 'c'].map(node)).edges).toEqual([['a', 'b'], ['b', 'c']]);
  });

  it('uses the newest version of a template', () => {
    const template = {
      versions: [
        { versionNumber: 1, graphDefinition: { nodes: [node('old')], edges: [] } },
        { versionNumber: 3, graphDefinition: line },
      ],
    } as unknown as WorkflowTemplate;
    expect(latestGraph(template)).toBe(line);
  });
});
