import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  NodeTypes, 
  EdgeTypes,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  MarkerType,
  useReactFlow,
  Node,
  SelectionMode,
  Panel,
} from 'reactflow';
import { Layers, Trash2, Mail, Box, Hand, MousePointer2, Download, PenLine } from 'lucide-react';
import { toPng } from 'html-to-image';

import CustomNode from './components/CustomNode';
import CustomEdge from './components/CustomEdge';
import QuantityModal from './components/QuantityModal';
import ConfirmationModal from './components/ConfirmationModal';
import NameModal from './components/NameModal';
import { initialNodes, initialEdges, defaultEdgeOptions } from './constants';
import { CustomNodeData, NodeType } from './types';

// Define custom node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Simple ID generator
const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

// Helper to determine edge style based on SOURCE and TARGET types
const getEdgeParams = (sourceType: NodeType, targetType: NodeType) => {
  // 1. Connection to Database (Legacy or External)
  if (targetType === NodeType.DATABASE) {
    return {
      label: 'SQL',
      style: { stroke: '#f59e0b', strokeWidth: 2 }, // Amber
      animated: false,
    };
  }

  // 2. Connection TO a Queue (Publishing)
  if (targetType === NodeType.QUEUE) {
    return {
      label: 'Publish',
      style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' }, // Emerald
      animated: true,
    };
  }

  // 3. Connection FROM a Queue (Consuming)
  if (sourceType === NodeType.QUEUE) {
    return {
      label: 'Consume',
      style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' }, // Emerald
      animated: true,
    };
  }

  // 4. External Connection
  if (targetType === NodeType.EXTERNAL) {
    return {
      label: 'HTTP',
      style: { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '4' }, // Indigo
      animated: false,
    };
  }

  // 5. Default: Service to Service (REST)
  return {
    label: 'REST',
    style: { stroke: '#3b82f6', strokeWidth: 2 }, // Blue
    animated: false,
  };
};

function AppContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Interaction Mode State
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('pan');
  
  // Diagram Title State
  const [diagramTitle, setDiagramTitle] = useState('Sem Título');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string;
    targetType: NodeType;
    direction: 'right' | 'bottom';
  } | null>(null);

  const { getNode } = useReactFlow();

  // Ref to store the latest version of the addNode function
  const requestConnectionRef = useRef<(sourceId: string, targetType: NodeType, direction: 'right' | 'bottom') => void>(() => {});

  // Handler for manual connections (drawing lines between nodes)
  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = getNode(params.source!);
      const targetNode = getNode(params.target!);

      const sourceType = sourceNode?.data?.type as NodeType || NodeType.SERVICE;
      const targetType = targetNode?.data?.type as NodeType || NodeType.SERVICE;
      
      const edgeParams = getEdgeParams(sourceType, targetType);

      const newEdge = {
        ...params,
        type: 'custom', // Use our custom edge
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeParams.style.stroke },
        ...edgeParams,
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, getNode],
  );

  // Updates node label
  const onLabelChange = useCallback((id: string, newLabel: string) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, label: newLabel }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Toggles internal database state
  const onToggleDatabase = useCallback((id: string) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, hasDatabase: !node.data.hasDatabase }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Deletes a node
  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  // ACTUAL LOGIC TO CREATE NODES
  const createNodesAndEdges = useCallback((sourceId: string, targetType: NodeType, direction: 'right' | 'bottom', count: number = 1) => {
    let sourceNode = getNode(sourceId);
    if (!sourceNode) {
        sourceNode = nodes.find(n => n.id === sourceId);
    }

    if (!sourceNode) return;

    const sourceType = sourceNode.data.type;
    const newNodes: Node<CustomNodeData>[] = [];
    const newEdges: Edge[] = [];
    
    // Spacing configuration
    const horizontalGap = 220;
    const verticalGap = 150; 

    for (let i = 0; i < count; i++) {
        const newId = generateId();
        
        let position = { x: 0, y: 0 };

        if (direction === 'bottom') {
          // Horizontal Distribution below parent
          // Center the group relative to parent
          const xOffset = (i - (count - 1) / 2) * horizontalGap;
          position = {
            x: sourceNode.position.x + xOffset,
            y: sourceNode.position.y + verticalGap
          };
        } else {
          // Vertical Distribution to the right of parent (default for Queues etc)
          const yOffset = (i - (count - 1) / 2) * verticalGap;
          position = {
            x: sourceNode.position.x + horizontalGap,
            y: sourceNode.position.y + yOffset
          };
        }

        let label = 'Novo Serviço';
        if (targetType === NodeType.QUEUE) label = 'IBM MQ';

        const newNode: Node<CustomNodeData> = {
          id: newId,
          type: 'custom',
          position,
          data: { 
            label, 
            type: targetType,
            // Use the Ref to avoid stale closures
            onAddConnection: (t, d) => requestConnectionRef.current(newId, t, d),
            onLabelChange: (l) => onLabelChange(newId, l),
            onDelete: () => onDeleteNode(newId),
            onToggleDatabase: () => onToggleDatabase(newId),
          },
        };

        const edgeParams = getEdgeParams(sourceType, targetType);

        // Logic to determine handle connection points based on layout direction
        let sourceHandle: string | null = null;
        let targetHandle: string | null = null;

        if (direction === 'bottom') {
            sourceHandle = 'bottom'; // Connects from the bottom of parent
            targetHandle = 'top';    // To the top of the child
        }

        const newEdge = {
          id: `e_${sourceId}-${newId}`,
          source: sourceId,
          target: newId,
          sourceHandle,
          targetHandle,
          type: 'custom', 
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeParams.style.stroke },
          ...edgeParams
        };

        newNodes.push(newNode);
        newEdges.push(newEdge);
    }

    setNodes((nds) => nds.concat(newNodes));
    setEdges((eds) => eds.concat(newEdges));
  }, [getNode, nodes, setNodes, setEdges, onLabelChange, onDeleteNode, onToggleDatabase]);


  // ENTRY POINT FROM NODE COMPONENT
  // This function decides if we need to open a modal or just proceed
  const handleRequestConnection = useCallback((sourceId: string, targetType: NodeType, direction: 'right' | 'bottom') => {
    if (targetType === NodeType.SERVICE) {
      // Open modal to ask for quantity
      setPendingConnection({ sourceId, targetType, direction });
      setIsModalOpen(true);
    } else {
      // Just add one (e.g. Queue)
      createNodesAndEdges(sourceId, targetType, direction, 1);
    }
  }, [createNodesAndEdges]);


  // Update the ref whenever the handler logic updates
  useEffect(() => {
    requestConnectionRef.current = handleRequestConnection;
  }, [handleRequestConnection]);


  // Modal Confirmation Handler
  const handleModalConfirm = (count: number) => {
    if (pendingConnection) {
      createNodesAndEdges(
        pendingConnection.sourceId, 
        pendingConnection.targetType, 
        pendingConnection.direction, 
        count
      );
    }
    setIsModalOpen(false);
    setPendingConnection(null);
  };


  // Main function to add a standalone Microservice (Root)
  const addMicroservice = () => {
    const id = generateId();
    const position = { 
      x: 250 + Math.random() * 50, 
      y: 250 + Math.random() * 50 
    };
    
    const newNode: Node<CustomNodeData> = {
      id,
      type: 'custom',
      position,
      data: { 
        label: 'Microserviço', 
        type: NodeType.SERVICE,
        onAddConnection: (t, d) => requestConnectionRef.current(id, t, d),
        onLabelChange: (l) => onLabelChange(id, l),
        onDelete: () => onDeleteNode(id),
        onToggleDatabase: () => onToggleDatabase(id),
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  // Main function to add a standalone Queue (Root)
  const addQueue = () => {
    const id = generateId();
    const position = { 
      x: 250 + Math.random() * 50, 
      y: 250 + Math.random() * 50 
    };
    
    const newNode: Node<CustomNodeData> = {
      id,
      type: 'custom',
      position,
      data: { 
        label: 'IBM MQ', 
        type: NodeType.QUEUE,
        onAddConnection: (t, d) => requestConnectionRef.current(id, t, d),
        onLabelChange: (l) => onLabelChange(id, l),
        onDelete: () => onDeleteNode(id),
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const handleClearConfirm = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);


  // Export to Image Logic
  const handleDownloadImage = () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement;

    if (!flowElement) return;

    // Detect if dark mode is active to set background color
    const isDarkMode = document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? '#020617' : '#f8fafc'; // slate-950 or slate-50

    // Capture the entire flow viewport
    toPng(flowElement, {
      backgroundColor: bgColor,
      style: {
        width: '100%',
        height: '100%',
      },
    }).then((dataUrl) => {
      const a = document.createElement('a');
      a.setAttribute('download', `${diagramTitle.replace(/\s+/g, '-').toLowerCase()}.png`);
      a.setAttribute('href', dataUrl);
      a.click();
    }).catch((err) => {
      console.error('Erro ao exportar imagem:', err);
    });
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 z-40 relative shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-blue-500/20 shadow-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              MicroFlow Architect
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Editor de Arquitetura</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          {/* Rename Button */}
          <button
            onClick={() => setIsNameModalOpen(true)}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors mr-2"
            title="Nomear Diagrama"
          >
            <PenLine className="w-4 h-4" />
            <span className="text-sm font-medium hidden md:inline max-w-[150px] truncate">{diagramTitle}</span>
          </button>

          {/* Interaction Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 mr-2">
            <button 
              onClick={() => setInteractionMode('pan')}
              className={`p-1.5 rounded-md transition-colors ${interactionMode === 'pan' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title="Modo Pan (Mover Tela)"
            >
              <Hand className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setInteractionMode('select')}
              className={`p-1.5 rounded-md transition-colors ${interactionMode === 'select' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title="Modo Seleção (Caixa de Seleção)"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

          <button
            onClick={addQueue}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <Mail className="w-5 h-5" />
            <span className="hidden sm:inline">Fila</span>
          </button>

           <button
            onClick={addMicroservice}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-md shadow-blue-600/20 active:scale-95"
          >
            <Box className="w-5 h-5" />
            <span className="hidden sm:inline">Microserviço</span>
          </button>

           <button
            onClick={handleDownloadImage}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
            title="Exportar para Imagem"
          >
            <Download className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setIsConfirmClearOpen(true)}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
            title="Limpar Diagrama"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-slate-50 dark:bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ ...defaultEdgeOptions, type: 'custom' }}
          fitView
          attributionPosition="bottom-left"
          className="dark:bg-slate-950"
          deleteKeyCode={['Backspace', 'Delete']}
          panOnDrag={interactionMode === 'pan'}
          selectionOnDrag={interactionMode === 'select'}
          selectionMode={SelectionMode.Partial}
        >
          <Background color="#94a3b8" gap={24} size={1} className="opacity-20" />
          <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 fill-slate-500 dark:fill-slate-400 shadow-xl rounded-lg m-4" />
          
          {/* Diagram Title Overlay */}
          <Panel position="top-center" className="mt-8 pointer-events-none">
             <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight opacity-80">
                  {diagramTitle}
                </h1>
             </div>
          </Panel>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 max-w-md">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Box className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Comece seu Diagrama</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  O canvas está vazio. Adicione componentes usando os botões acima.
                </p>
                <div className="flex gap-2 justify-center">
                    <span className="text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">+ Fila</span>
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">+ Microserviço</span>
                </div>
              </div>
            </div>
          )}
        </ReactFlow>
        
        {/* Floating Legend */}
        <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2 pointer-events-none z-10 hidden sm:block">
          <div className="font-bold text-slate-500 mb-2 uppercase tracking-wider">Conexões</div>
          <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-blue-500"></div><span className="text-slate-700 dark:text-slate-300">REST (Azul)</span></div>
          <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-amber-500"></div><span className="text-slate-700 dark:text-slate-300">SQL (Laranja)</span></div>
          <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-emerald-500 border-t border-dashed"></div><span className="text-slate-700 dark:text-slate-300">MQ (Verde)</span></div>
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 italic text-slate-500">
            * Passe o mouse na conexão para remover
          </div>
        </div>
      </div>

      <QuantityModal 
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setPendingConnection(null);
        }}
        onConfirm={handleModalConfirm}
      />
      
      <NameModal 
        isOpen={isNameModalOpen}
        currentName={diagramTitle}
        onClose={() => setIsNameModalOpen(false)}
        onConfirm={(name) => setDiagramTitle(name)}
      />

      <ConfirmationModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleClearConfirm}
        title="Limpar Diagrama"
        message="Tem certeza que deseja limpar todo o diagrama? Esta ação não pode ser desfeita e removerá todos os serviços, filas e conexões."
      />
    </div>
  );
}

const App = () => {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
};

export default App;