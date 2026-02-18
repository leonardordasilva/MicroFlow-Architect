import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

const NODE_WIDTH = 220; // Largura aproximada do nó + gap
const NODE_HEIGHT = 150; // Altura aproximada do nó + gap

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configura a direção do grafo no Dagre
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80, // Espaçamento entre nós no mesmo rank
    ranksep: 120  // Espaçamento entre ranks (camadas)
  });

  nodes.forEach((node) => {
    // Ajusta tamanho baseando-se se tem bancos de dados internos para evitar sobreposição
    let height = NODE_HEIGHT;
    if (node.data.databases && node.data.databases.length > 0) {
        height += (node.data.databases.length * 30);
    }
    
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Determina a posição dos handles (pontos de conexão) baseada na direção do layout
  let targetPosition = Position.Left;
  let sourcePosition = Position.Right;

  if (direction === 'TB') {
    targetPosition = Position.Top;
    sourcePosition = Position.Bottom;
  } else if (direction === 'RL') {
    targetPosition = Position.Right;
    sourcePosition = Position.Left;
  } else if (direction === 'BT') {
    targetPosition = Position.Bottom;
    sourcePosition = Position.Top;
  }

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // React Flow usa coordenadas top-left, Dagre usa center. Vamos converter.
    const x = nodeWithPosition.x - (NODE_WIDTH / 2);
    const y = nodeWithPosition.y - (NODE_HEIGHT / 2);

    return {
      ...node,
      targetPosition,
      sourcePosition,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};