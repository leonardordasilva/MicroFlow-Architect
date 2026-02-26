import { describe, it, expect } from 'vitest';
import { exportToMermaid } from './exportService';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

const makeNode = (id: string, label: string, type: string): DiagramNode => ({
  id,
  type: type as any,
  position: { x: 0, y: 0 },
  data: { label, type: type as any } as any,
});

describe('exportToMermaid', () => {
  it('should generate graph LR header', () => {
    const result = exportToMermaid([], []);
    expect(result).toBe('graph LR');
  });

  it('should generate correct shape for service nodes (rectangle)', () => {
    const nodes = [makeNode('1', 'Auth Service', 'service')];
    const result = exportToMermaid(nodes, []);
    expect(result).toContain('N0["Auth Service"]');
  });

  it('should represent database as cylinder', () => {
    const nodes = [makeNode('1', 'Users DB', 'database')];
    const result = exportToMermaid(nodes, []);
    expect(result).toContain('N0[("Users DB")]');
  });

  it('should represent queue with flag shape', () => {
    const nodes = [makeNode('1', 'Order Queue', 'queue')];
    const result = exportToMermaid(nodes, []);
    expect(result).toContain('N0>"Order Queue"]');
  });

  it('should represent external as stadium/pill', () => {
    const nodes = [makeNode('1', 'Payment API', 'external')];
    const result = exportToMermaid(nodes, []);
    expect(result).toContain('N0("Payment API")');
  });

  it('should include protocol labels on edges', () => {
    const nodes = [makeNode('a', 'A', 'service'), makeNode('b', 'B', 'service')];
    const edges: DiagramEdge[] = [
      { id: 'e1', source: 'a', target: 'b', label: 'REST', data: {} as any },
    ];
    const result = exportToMermaid(nodes, edges);
    expect(result).toContain('N0 -->|REST| N1');
  });

  it('should render edges without labels', () => {
    const nodes = [makeNode('a', 'A', 'service'), makeNode('b', 'B', 'service')];
    const edges: DiagramEdge[] = [
      { id: 'e1', source: 'a', target: 'b', data: {} as any },
    ];
    const result = exportToMermaid(nodes, edges);
    expect(result).toContain('N0 --> N1');
  });

  it('should escape special characters in node labels', () => {
    const nodes = [makeNode('1', 'Auth [v2] (new)', 'service')];
    const result = exportToMermaid(nodes, []);
    // Brackets and parens should be replaced
    expect(result).not.toContain('[v2]');
    expect(result).not.toContain('(new)');
  });
});
