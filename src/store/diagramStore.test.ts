import { describe, it, expect, beforeEach } from 'vitest';
import { useDiagramStore } from './diagramStore';

const { getState } = useDiagramStore;

function resetStore() {
  getState().clearCanvas();
  getState().setDiagramName('Novo Diagrama');
  // Clear undo history
  useDiagramStore.temporal.getState().clear();
}

describe('diagramStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('addNode', () => {
    it('should add a service node', () => {
      getState().addNode('service');
      expect(getState().nodes).toHaveLength(1);
      expect(getState().nodes[0].type).toBe('service');
    });

    it('should add a database node with subType', () => {
      getState().addNode('database', 'Redis');
      const node = getState().nodes[0];
      expect(node.type).toBe('database');
      expect((node.data as any).subType).toBe('Redis');
    });

    it('should add a queue node with Kafka subType', () => {
      getState().addNode('queue', 'Kafka');
      const node = getState().nodes[0];
      expect(node.type).toBe('queue');
      expect((node.data as any).subType).toBe('Kafka');
      expect((node.data as any).label).toBe('Kafka');
    });

    it('should add an external node with gRPC subType', () => {
      getState().addNode('external', 'gRPC');
      const node = getState().nodes[0];
      expect(node.type).toBe('external');
      expect((node.data as any).subType).toBe('gRPC');
      expect((node.data as any).label).toBe('gRPC');
    });
  });

  describe('deleteSelected', () => {
    it('should remove selected nodes and connected edges', () => {
      getState().addNode('service');
      getState().addNode('service');
      const [n1, n2] = getState().nodes;

      // Manually select first node
      getState().setNodes(
        getState().nodes.map((n) => (n.id === n1.id ? { ...n, selected: true } : n))
      );

      // Add an edge between them
      getState().setEdges([
        { id: 'e1', source: n1.id, target: n2.id, type: 'editable', data: { waypoints: undefined } },
      ]);

      getState().deleteSelected();
      expect(getState().nodes).toHaveLength(1);
      expect(getState().nodes[0].id).toBe(n2.id);
      // Edge connected to deleted node should also be removed
      expect(getState().edges).toHaveLength(0);
    });
  });

  describe('clearCanvas', () => {
    it('should result in empty arrays', () => {
      getState().addNode('service');
      getState().addNode('database', 'Oracle');
      expect(getState().nodes).toHaveLength(2);

      getState().clearCanvas();
      expect(getState().nodes).toHaveLength(0);
      expect(getState().edges).toHaveLength(0);
    });
  });

  describe('setDiagramName', () => {
    it('should update the diagram name', () => {
      getState().setDiagramName('Meu Diagrama');
      expect(getState().diagramName).toBe('Meu Diagrama');
    });
  });

  describe('exportJSON', () => {
    it('should export valid JSON with name, nodes, edges', () => {
      getState().setDiagramName('Test');
      getState().addNode('service');
      const json = getState().exportJSON();
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Test');
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.edges).toHaveLength(0);
    });
  });

  describe('loadDiagram', () => {
    it('should replace nodes and edges', () => {
      getState().addNode('service');
      const mockNodes = [
        { id: 'a', type: 'service' as const, position: { x: 0, y: 0 }, data: { label: 'A', type: 'service' as const } },
        { id: 'b', type: 'queue' as const, position: { x: 100, y: 0 }, data: { label: 'B', type: 'queue' as const } },
      ];
      getState().loadDiagram(mockNodes as any, []);
      expect(getState().nodes).toHaveLength(2);
      expect(getState().nodes[0].id).toBe('a');
    });
  });

  describe('undo/redo (zundo)', () => {
    it('should undo addNode and restore previous state', () => {
      expect(getState().nodes).toHaveLength(0);

      getState().addNode('service');
      expect(getState().nodes).toHaveLength(1);

      useDiagramStore.temporal.getState().undo();
      expect(getState().nodes).toHaveLength(0);
    });

    it('should redo after undo', () => {
      getState().addNode('service');
      useDiagramStore.temporal.getState().undo();
      expect(getState().nodes).toHaveLength(0);

      useDiagramStore.temporal.getState().redo();
      expect(getState().nodes).toHaveLength(1);
    });
  });

  describe('addNodesFromSource', () => {
    it('should create nodes and edges from a source node', () => {
      getState().addNode('service');
      const source = getState().nodes[0];

      getState().addNodesFromSource(source.id, 'queue', 2, 'MQ');
      expect(getState().nodes).toHaveLength(3);
      expect(getState().edges).toHaveLength(2);
    });

    it('should embed Oracle database inside service node', () => {
      getState().addNode('service');
      const source = getState().nodes[0];

      getState().addNodesFromSource(source.id, 'database', 1, 'Oracle');
      // Should NOT create a new node, should embed
      expect(getState().nodes).toHaveLength(1);
      expect((getState().nodes[0].data as any).internalDatabases).toHaveLength(1);
    });
  });
});
