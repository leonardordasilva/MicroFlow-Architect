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
  ConnectionMode,
  NodeDragHandler,
} from 'reactflow';
import { Layers, Trash2, Mail, Box, Hand, MousePointer2, Download, PenLine, Sparkles, LayoutTemplate, Undo2, Redo2, FileJson, UploadCloud } from 'lucide-react';
import { toPng } from 'html-to-image';

import CustomNode from './components/CustomNode';
import CustomEdge from './components/CustomEdge';
import QuantityModal from './components/QuantityModal';
import ConfirmationModal from './components/ConfirmationModal';
import NameModal from './components/NameModal';
import TextToDiagramModal from './components/TextToDiagramModal';
import ImportModal from './components/ImportModal'; // Updated path
import { initialNodes, initialEdges, defaultEdgeOptions } from './constants';
import { CustomNodeData, NodeType, InternalDatabase, InternalService } from './types';
import { generateDiagramFromText } from './services/geminiService';
import { getLayoutedElements } from './services/layoutService';

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
const generateDbId = () => `db_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const generateSvcId = () => `svc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

// History Interface
interface HistoryState {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
}

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
  
  // History State
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // Interaction Mode State
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('pan');
  
  // Diagram Title State
  const [diagramTitle, setDiagramTitle] = useState('Sem Título');
  
  // Layout Direction State ('LR' = Left-Right, 'TB' = Top-Bottom, etc.)
  const [currentLayoutDir, setCurrentLayoutDir] = useState('LR');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isTextToDiagramOpen, setIsTextToDiagramOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string;
    sourceType: NodeType; // Add sourceType to context
    targetType: NodeType;
    direction: 'right' | 'bottom';
  } | null>(null);

  const { getNode, fitView, getNodes, getEdges } = useReactFlow();

  // --- HISTORY MANAGEMENT ---

  const takeSnapshot = useCallback(() => {
    setPast((oldPast) => {
      // Limit history size to prevent memory issues (e.g., 50 steps)
      const newPast = [...oldPast, { nodes, edges }];
      if (newPast.length > 50) newPast.shift();
      return newPast;
    });
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((oldFuture) => [{ nodes, edges }, ...oldFuture]);

    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [past, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((oldPast) => [...oldPast, { nodes, edges }]);
    setFuture(newFuture);

    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);


  // Ref to store the latest version of the addNode function
  const requestConnectionRef = useRef<(sourceId: string, targetType: NodeType, direction: 'right' | 'bottom') => void>(() => {});

  // --- EVENT HANDLERS WITH SNAPSHOTS ---

  // Handler for manual connections (drawing lines between nodes)
  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot(); // Snapshot before connecting

      const sourceNode = getNode(params.source!);
      const targetNode = getNode(params.target!);

      const sourceType = sourceNode?.data?.type as NodeType || NodeType.SERVICE;
      const targetType = targetNode?.data?.type as NodeType || NodeType.SERVICE;
      
      const edgeParams = getEdgeParams(sourceType, targetType);

      const newEdge = {
        ...params, // Use the handles selected by the user
        type: 'custom', // Use our custom edge
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeParams.style.stroke }, // Ensure arrow points to target
        ...edgeParams,
        data: { labelX: 0, labelY: 0 } // Initialize label offset
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, getNode, takeSnapshot],
  );

  // Snapshot on Node Drag Start (Save position before moving)
  const onNodeDragStart: NodeDragHandler = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  // Auto Layout Handler
  const onLayout = useCallback(() => {
    takeSnapshot();
    // Cycle: LR -> TB -> RL -> BT -> LR
    const directions = ['LR', 'TB', 'RL', 'BT'];
    const currentIndex = directions.indexOf(currentLayoutDir);
    const nextDirection = directions[(currentIndex + 1) % directions.length];
    
    // Friendly name for Toast/Console (optional)
    const dirNames: Record<string, string> = { 
        'LR': 'Horizontal', 
        'TB': 'Vertical', 
        'RL': 'Horizontal Inverso', 
        'BT': 'Vertical Inverso' 
    };
    console.log(`Alterando layout para: ${dirNames[nextDirection]}`);

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      nextDirection
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    setCurrentLayoutDir(nextDirection);

    setTimeout(() => {
        window.requestAnimationFrame(() => {
            fitView({ padding: 0.3, duration: 800 });
        });
    }, 10);
  }, [nodes, edges, currentLayoutDir, setNodes, setEdges, fitView, takeSnapshot]);

  // Updates node label
  const onLabelChange = useCallback((id: string, newLabel: string) => {
    takeSnapshot();
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
  }, [setNodes, takeSnapshot]);

  // Rename Internal Database
  const onRenameDatabase = useCallback((nodeId: string, dbId: string, newLabel: string) => {
    takeSnapshot();
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId && node.data.databases) {
          const newDbs = node.data.databases.map(db => 
            db.id === dbId ? { ...db, label: newLabel } : db
          );
          return {
            ...node,
            data: { ...node.data, databases: newDbs }
          };
        }
        return node;
      })
    );
  }, [setNodes, takeSnapshot]);

  // Delete Internal Database
  const onDeleteDatabase = useCallback((nodeId: string, dbId: string) => {
    takeSnapshot();
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId && node.data.databases) {
          const newDbs = node.data.databases.filter(db => db.id !== dbId);
          return {
            ...node,
            data: { 
              ...node.data, 
              databases: newDbs,
              hasDatabase: newDbs.length > 0 
            }
          };
        }
        return node;
      })
    );
  }, [setNodes, takeSnapshot]);

  // Rename Internal Service
  const onRenameService = useCallback((nodeId: string, svcId: string, newLabel: string) => {
    takeSnapshot();
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId && node.data.services) {
          const newSvcs = node.data.services.map(svc => 
            svc.id === svcId ? { ...svc, label: newLabel } : svc
          );
          return {
            ...node,
            data: { ...node.data, services: newSvcs }
          };
        }
        return node;
      })
    );
  }, [setNodes, takeSnapshot]);

  // Delete Internal Service
  const onDeleteService = useCallback((nodeId: string, svcId: string) => {
    takeSnapshot();
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId && node.data.services) {
          const newSvcs = node.data.services.filter(svc => svc.id !== svcId);
          return {
            ...node,
            data: { 
              ...node.data, 
              services: newSvcs,
            }
          };
        }
        return node;
      })
    );
  }, [setNodes, takeSnapshot]);


  // Toggles internal database state (Adding 1 default DB)
  const onToggleDatabase = useCallback((id: string) => {
    takeSnapshot();
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === id) {
          const currentDbs = node.data.databases || [];
          if (currentDbs.length > 0) {
             return {
              ...node,
              data: { ...node.data, databases: [], hasDatabase: false }
             }
          } else {
             return {
              ...node,
              data: { 
                ...node.data, 
                databases: [{ id: generateDbId(), label: 'Oracle DB' }], 
                hasDatabase: true 
              }
             }
          }
        }
        return node;
      })
    );
  }, [setNodes, takeSnapshot]);

  // Deletes a node
  const onDeleteNode = useCallback((id: string) => {
    takeSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges, takeSnapshot]);

  // ACTUAL LOGIC TO CREATE NODES
  const createNodesAndEdges = useCallback((sourceId: string, targetType: NodeType, direction: 'right' | 'bottom', count: number = 1) => {
    let sourceNode = getNode(sourceId);
    if (!sourceNode) {
        sourceNode = nodes.find(n => n.id === sourceId);
    }

    if (!sourceNode) return;

    const newNodes: Node<CustomNodeData>[] = [];
    
    // Spacing configuration
    const horizontalGap = 220;
    const verticalGap = 150; 

    for (let i = 0; i < count; i++) {
        const newId = generateId();
        
        let position = { x: 0, y: 0 };

        if (direction === 'bottom') {
          // Horizontal Distribution below parent
          const xOffset = (i - (count - 1) / 2) * horizontalGap;
          position = {
            x: sourceNode.position.x + xOffset,
            y: sourceNode.position.y + verticalGap
          };
        } else {
          // Vertical Distribution to the right of parent
          const yOffset = (i - (count - 1) / 2) * verticalGap;
          position = {
            x: sourceNode.position.x + horizontalGap,
            y: sourceNode.position.y + yOffset
          };
        }

        let label = 'Novo Serviço';
        if (targetType === NodeType.QUEUE) label = 'IBM MQ';
        if (targetType === NodeType.DATABASE) label = 'Oracle DB';

        const newNode: Node<CustomNodeData> = {
          id: newId,
          type: 'custom',
          position,
          data: { 
            label, 
            type: targetType,
            databases: [], // Init empty
            services: [],
            onAddConnection: (t, d) => requestConnectionRef.current(newId, t, d),
            onLabelChange: (l) => onLabelChange(newId, l),
            onDelete: () => onDeleteNode(newId),
            onToggleDatabase: () => onToggleDatabase(newId),
            onRenameDatabase: (dbId, val) => onRenameDatabase(newId, dbId, val),
            onDeleteDatabase: (dbId) => onDeleteDatabase(newId, dbId),
            onRenameService: (svcId, val) => onRenameService(newId, svcId, val),
            onDeleteService: (svcId) => onDeleteService(newId, svcId),
          },
        };

        newNodes.push(newNode);
        // NO EDGE CREATION HERE (as per user request)
    }

    setNodes((nds) => nds.concat(newNodes));
  }, [getNode, nodes, setNodes, onLabelChange, onDeleteNode, onToggleDatabase, onRenameDatabase, onDeleteDatabase, onRenameService, onDeleteService]);


  // ENTRY POINT FROM NODE COMPONENT
  const handleRequestConnection = useCallback((sourceId: string, targetType: NodeType, direction: 'right' | 'bottom') => {
    takeSnapshot();
    
    // Determine source type for logic in Modal
    const sourceNode = getNode(sourceId) || nodes.find(n => n.id === sourceId);
    const sourceType = sourceNode?.data?.type || NodeType.SERVICE;

    if (targetType === NodeType.SERVICE || targetType === NodeType.DATABASE) {
      setPendingConnection({ sourceId, sourceType, targetType, direction });
      setIsModalOpen(true);
    } else {
      createNodesAndEdges(sourceId, targetType, direction, 1);
    }
  }, [createNodesAndEdges, takeSnapshot, getNode, nodes]);


  // Update the ref whenever the handler logic updates
  useEffect(() => {
    requestConnectionRef.current = handleRequestConnection;
  }, [handleRequestConnection]);


  // Modal Confirmation Handler
  const handleModalConfirm = (count: number, isInternal: boolean) => {
    if (pendingConnection) {
      
      const { sourceId, targetType, direction } = pendingConnection;

      // Logic for Internal Addition (Nested)
      // Conditions:
      // 1. Target is DATABASE (Always internal in current default, but kept logic here)
      // 2. Target is SERVICE AND user selected Internal
      if (targetType === NodeType.DATABASE || (targetType === NodeType.SERVICE && isInternal)) {
        setNodes((nds) => nds.map((node) => {
          if (node.id === sourceId) {
            
            // Adding Databases
            if (targetType === NodeType.DATABASE) {
                const newDbs: InternalDatabase[] = Array.from({ length: count }).map((_, i) => ({
                    id: generateDbId(),
                    label: 'Oracle DB'
                }));
                const existingDbs = node.data.databases || [];
                return {
                  ...node,
                  data: {
                    ...node.data,
                    hasDatabase: true, 
                    databases: [...existingDbs, ...newDbs]
                  }
                };
            }
            
            // Adding Services (Nested)
            if (targetType === NodeType.SERVICE) {
                const newSvcs: InternalService[] = Array.from({ length: count }).map((_, i) => ({
                    id: generateSvcId(),
                    label: `Service ${i + 1}`
                }));
                const existingSvcs = node.data.services || [];
                return {
                  ...node,
                  data: {
                    ...node.data,
                    services: [...existingSvcs, ...newSvcs]
                  }
                };
            }
          }
          return node;
        }));
      } else {
        // Logic for External Addition (New Node)
        createNodesAndEdges(sourceId, targetType, direction, count);
      }
    }
    setIsModalOpen(false);
    setPendingConnection(null);
  };

  // Process generated nodes (from AI or JSON Import) to add interactivity methods
  const processGeneratedElements = (newNodes: Node<CustomNodeData>[], newEdges: Edge[]) => {
      const interactiveNodes = newNodes.map(n => {
        let databases: InternalDatabase[] = [];
        let services: InternalService[] = [];

        if (n.data.databases && Array.isArray(n.data.databases) && n.data.databases.length > 0) {
          databases = n.data.databases.map((db: any) => ({
              id: db.id || generateDbId(),
              label: db.label || 'Oracle DB'
          }));
        } else if (n.data.hasDatabase) {
          databases = [{ id: generateDbId(), label: 'Oracle DB' }];
        }
        
        if (n.data.services && Array.isArray(n.data.services) && n.data.services.length > 0) {
           services = n.data.services.map((svc: any) => ({
              id: svc.id || generateSvcId(),
              label: svc.label || 'Internal Service'
           }));
        }

        return {
          ...n,
          type: 'custom', 
          data: {
              ...n.data,
              databases: databases,
              services: services,
              onAddConnection: (t: NodeType, d: 'right' | 'bottom') => requestConnectionRef.current(n.id, t, d),
              onLabelChange: (l: string) => onLabelChange(n.id, l),
              onDelete: () => onDeleteNode(n.id),
              onToggleDatabase: () => onToggleDatabase(n.id),
              onRenameDatabase: (dbId: string, val: string) => onRenameDatabase(n.id, dbId, val),
              onDeleteDatabase: (dbId: string) => onDeleteDatabase(n.id, dbId),
              onRenameService: (svcId: string, val: string) => onRenameService(n.id, svcId, val),
              onDeleteService: (svcId: string) => onDeleteService(n.id, svcId),
          }
        };
      });

      const interactiveEdges = newEdges.map(e => {
        // Attempt to find node in new set, otherwise try existing nodes
        const sourceNode = interactiveNodes.find(n => n.id === e.source) || nodes.find(n => n.id === e.source);
        const targetNode = interactiveNodes.find(n => n.id === e.target) || nodes.find(n => n.id === e.target);
        
        const params = getEdgeParams(
          (sourceNode?.data.type as NodeType) || NodeType.SERVICE, 
          (targetNode?.data.type as NodeType) || NodeType.SERVICE
        );

        return {
          ...e,
          type: 'custom',
          markerEnd: { type: MarkerType.ArrowClosed, color: params.style.stroke },
          ...params,
          data: { labelX: 0, labelY: 0 }
        };
      });

      return { interactiveNodes, interactiveEdges };
  };

  // Generate Diagram Handler (Text)
  const handleGenerateDiagram = async (description: string) => {
    takeSnapshot();
    const { nodes: newNodes, edges: newEdges } = await generateDiagramFromText(description);
    const { interactiveNodes, interactiveEdges } = processGeneratedElements(newNodes, newEdges);

    setNodes(interactiveNodes);
    setEdges(interactiveEdges);
    
    // Auto layout after generation (Reset to LR)
    applyAutoLayout(interactiveNodes, interactiveEdges);
  };

  // Unified Handler for Importing Content (JSON)
  const handleImportContent = async (content: string, type: 'json') => {
    takeSnapshot();

    if (type === 'json') {
      try {
        const parsed = JSON.parse(content);
        
        // Basic validation
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            throw new Error("Formato JSON inválido: 'nodes' e 'edges' são obrigatórios.");
        }

        if (parsed.title) {
            setDiagramTitle(parsed.title);
        }

        // Restore interactivity hooks
        const { interactiveNodes, interactiveEdges } = processGeneratedElements(parsed.nodes, parsed.edges);

        setNodes(interactiveNodes);
        setEdges(interactiveEdges);
        
        setTimeout(() => fitView({ padding: 0.3, duration: 500 }), 100);

      } catch (err) {
        console.error("Erro ao importar JSON:", err);
        throw new Error("Erro ao processar o arquivo JSON. Verifique se é um banco de dados válido.");
      }
    }
  };

  // Export JSON Handler
  const handleDownloadJSON = () => {
    const data = {
        title: diagramTitle,
        timestamp: new Date().toISOString(),
        nodes: getNodes(),
        edges: getEdges(),
    };

    // Clean data (optional: removing non-serializable function refs if desired, but JSON.stringify does this automatically by ignoring functions)
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagramTitle.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // Helper to apply layout after generation
  const applyAutoLayout = (currentNodes: Node[], currentEdges: Edge[]) => {
      setTimeout(() => {
          const layouted = getLayoutedElements(currentNodes, currentEdges, 'LR');
          
          setNodes([...layouted.nodes]);
          setEdges([...currentEdges]); // Edges don't change logic anymore
          setCurrentLayoutDir('LR');
          window.requestAnimationFrame(() => fitView({ padding: 0.3, duration: 800 }));
      }, 100);
  };


  const addMicroservice = () => {
    takeSnapshot();
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
        databases: [],
        services: [],
        onAddConnection: (t, d) => requestConnectionRef.current(id, t, d),
        onLabelChange: (l) => onLabelChange(id, l),
        onDelete: () => onDeleteNode(id),
        onToggleDatabase: () => onToggleDatabase(id),
        onRenameDatabase: (dbId, val) => onRenameDatabase(id, dbId, val),
        onDeleteDatabase: (dbId) => onDeleteDatabase(id, dbId),
        onRenameService: (svcId, val) => onRenameService(id, svcId, val),
        onDeleteService: (svcId) => onDeleteService(id, svcId),
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const addQueue = () => {
    takeSnapshot();
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
        databases: [],
        services: [],
        onAddConnection: (t, d) => requestConnectionRef.current(id, t, d),
        onLabelChange: (l) => onLabelChange(id, l),
        onDelete: () => onDeleteNode(id),
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const handleClearConfirm = useCallback(() => {
    takeSnapshot();
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges, takeSnapshot]);


  const handleDownloadImage = () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement;

    if (!flowElement) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? '#020617' : '#f8fafc';

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

  const getModalTitle = () => {
    if (pendingConnection?.targetType === NodeType.DATABASE) return "Adicionar Bancos de Dados";
    return "Adicionar Microserviços";
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
          
          {/* Undo/Redo Buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 mr-2">
            <button 
              onClick={undo}
              disabled={past.length === 0}
              className={`p-1.5 rounded-md transition-colors ${past.length === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm'}`}
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              onClick={redo}
              disabled={future.length === 0}
              className={`p-1.5 rounded-md transition-colors ${future.length === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-sm'}`}
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {/* Rename Button */}
          <button
            onClick={() => setIsNameModalOpen(true)}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors mr-2"
            title="Nomear Diagrama"
          >
            <PenLine className="w-4 h-4" />
            <span className="text-sm font-medium hidden md:inline max-w-[150px] truncate">{diagramTitle}</span>
          </button>

          {/* AI Generator Button (Text) */}
          <button
            onClick={() => setIsTextToDiagramOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors mr-1 shadow-md shadow-purple-600/20 active:scale-95"
            title="Gerar Diagrama com IA (Texto)"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline font-medium">IA Texto</span>
          </button>

          {/* Import Button (JSON) */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg transition-colors mr-2 shadow-md shadow-amber-500/20 active:scale-95"
            title="Importar (JSON)"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden md:inline font-medium">Importar</span>
          </button>
          
           {nodes.length > 0 && (
             <button
               onClick={onLayout}
               className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg transition-colors mr-2 border border-slate-200 dark:border-slate-700 group"
               title="Alterar Layout (Ciclo: Horizontal -> Vertical)"
             >
               <LayoutTemplate className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
               <span className="hidden lg:inline text-sm font-medium">Layout</span>
             </button>
           )}

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
          
           {/* Export JSON Button */}
           <button
            onClick={handleDownloadJSON}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
            title="Exportar para JSON (Backup)"
          >
            <FileJson className="w-5 h-5" />
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
          onNodeDragStart={onNodeDragStart}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ ...defaultEdgeOptions, type: 'custom' }}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          attributionPosition="bottom-left"
          className="dark:bg-slate-950"
          deleteKeyCode={['Backspace', 'Delete']}
          panOnDrag={interactionMode === 'pan'}
          selectionOnDrag={interactionMode === 'select'}
          selectionMode={SelectionMode.Partial}
          snapToGrid={true}
          snapGrid={[24, 24]}
          connectionMode={ConnectionMode.Loose}
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
                  O canvas está vazio. Adicione componentes usando os botões acima ou use a <strong>IA Geradora</strong>.
                </p>
                <div className="flex gap-2 justify-center items-center flex-wrap">
                    <span className="text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">+ Fila</span>
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">+ Microserviço</span>
                    <button onClick={() => setIsTextToDiagramOpen(true)} className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Gerar com IA
                    </button>
                    <button onClick={() => setIsImportModalOpen(true)} className="text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors flex items-center gap-1">
                      <UploadCloud className="w-3 h-3" />
                      Importar JSON
                    </button>
                </div>
              </div>
            </div>
          )}
        </ReactFlow>
        
        {/* Floating Legend */}
        <div className="absolute bottom-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2 pointer-events-none z-10 hidden sm:block">
          <div className="font-bold text-slate-500 mb-2 uppercase tracking-wider">Conexões</div>
          <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-blue-500"></div><span className="text-slate-700 dark:text-slate-300">REST (Azul)</span></div>
          <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-amber-500"></div><span className="text-slate-700 dark:text-slate-300">SQL (Laranja)</span></div>
          <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-emerald-500 border-t border-dashed"></div><span className="text-slate-700 dark:text-slate-300">MQ (Verde)</span></div>
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 italic text-slate-500">
            * Passe o mouse na conexão para remover
            <br />
            * Arraste o label da conexão para mover
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
        title={getModalTitle()}
        targetType={pendingConnection?.targetType}
        sourceType={pendingConnection?.sourceType}
      />
      
      <NameModal 
        isOpen={isNameModalOpen}
        currentName={diagramTitle}
        onClose={() => setIsNameModalOpen(false)}
        onConfirm={(name) => setDiagramTitle(name)}
      />

      <TextToDiagramModal 
        isOpen={isTextToDiagramOpen}
        onClose={() => setIsTextToDiagramOpen(false)}
        onGenerate={handleGenerateDiagram}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportContent}
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