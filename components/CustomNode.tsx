import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from 'reactflow';
import { Database, Mail, Box, Globe, ArrowRight, Trash2, Edit3, PlusSquare, X } from 'lucide-react';
import { CustomNodeData, NodeType } from '../types';

const CustomNode = ({ data, selected, id }: NodeProps<CustomNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingDbId, setEditingDbId] = useState<string | null>(null); // Track which DB is being edited
  const [label, setLabel] = useState(data.label);
  const [dbLabel, setDbLabel] = useState(""); 
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dbInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if prop changes externally
  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (editingDbId && dbInputRef.current) {
      dbInputRef.current.focus();
      dbInputRef.current.select();
    }
  }, [editingDbId]);

  const onSubmitLabel = () => {
    setIsEditing(false);
    if (data.onLabelChange && label.trim() !== "") {
      data.onLabelChange(label);
    } else {
      setLabel(data.label); // Revert if empty
    }
  };

  const onSubmitDbLabel = () => {
    if (editingDbId && data.onRenameDatabase && dbLabel.trim() !== "") {
        data.onRenameDatabase(editingDbId, dbLabel);
    }
    setEditingDbId(null);
  };

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter') {
      onSubmitLabel();
    } else if (evt.key === 'Escape') {
      setIsEditing(false);
      setLabel(data.label);
    }
  };

  const handleDbKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter') {
      onSubmitDbLabel();
    } else if (evt.key === 'Escape') {
      setEditingDbId(null);
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case NodeType.DATABASE: return <Database className="w-5 h-5 text-amber-500" />;
      case NodeType.QUEUE: return <Mail className="w-5 h-5 text-emerald-500" />;
      case NodeType.EXTERNAL: return <Globe className="w-5 h-5 text-indigo-400" />;
      case NodeType.SERVICE:
      default: return <Box className="w-5 h-5 text-blue-500" />;
    }
  };

  // Styles adjusted for smaller size (w-52 -> w-40, p-4 -> p-3)
  const getStyles = () => {
    let base = "bg-white dark:bg-slate-800 shadow-xl rounded-xl p-3 w-40 flex flex-col items-center gap-2 transition-all duration-200 relative";
    if (selected) base += " ring-2 ring-blue-500 scale-105";
    
    switch (data.type) {
      case NodeType.DATABASE: return `${base} border-b-4 border-amber-500`;
      case NodeType.QUEUE: return `${base} border-b-4 border-emerald-500 rounded-lg`;
      case NodeType.EXTERNAL: return `${base} border-b-4 border-indigo-400 border-dashed`;
      default: return `${base} border-b-4 border-blue-500`;
    }
  };

  const handleAdd = (e: React.MouseEvent, type: NodeType, dir: 'right' | 'bottom') => {
    e.stopPropagation(); // Evita conflito com seleção do nó
    e.preventDefault();

    // Delegate the UI logic (modal vs immediate) to the parent component via callback
    if (data.onAddConnection) {
        data.onAddConnection(type, dir);
    }
  };

  const toggleDB = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onToggleDatabase) {
      data.onToggleDatabase();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) data.onDelete();
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const startEditingDb = (e: React.MouseEvent, id: string, currentLabel: string) => {
    e.stopPropagation();
    setDbLabel(currentLabel);
    setEditingDbId(id);
  };

  const handleDeleteDb = (e: React.MouseEvent, dbId: string) => {
    e.stopPropagation();
    if (data.onDeleteDatabase) {
        data.onDeleteDatabase(dbId);
    }
  }

  // Logic for what buttons to show in the toolbar
  const canAddQueue = data.type === NodeType.SERVICE;
  const canAddService = data.type === NodeType.SERVICE || data.type === NodeType.QUEUE;
  const canAddDB = data.type === NodeType.SERVICE;
  const isStandaloneDB = data.type === NodeType.DATABASE;
  
  // Queues cannot be renamed
  const isRenamable = data.type !== NodeType.QUEUE;

  const databases = data.databases || [];

  return (
    <>
      {/* Context Toolbar - Visibility depends on node type rules */}
      {!isStandaloneDB && (
        <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
          
          {canAddQueue && (
            <button 
              onClick={(e) => handleAdd(e, NodeType.QUEUE, 'right')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
              title="Adicionar Fila IBM MQ Conectada"
            >
              <Mail className="w-3 h-3" />
              <span>+ Fila</span>
            </button>
          )}

          {canAddDB && (
            <button 
              onClick={(e) => handleAdd(e, NodeType.DATABASE, 'bottom')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors"
              title="Adicionar Banco(s) de Dados"
            >
              <Database className="w-3 h-3" />
              <span>+ DB</span>
            </button>
          )}
          
          {canAddService && (
            <button 
              onClick={(e) => handleAdd(e, NodeType.SERVICE, data.type === NodeType.SERVICE ? 'bottom' : 'right')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
              title="Adicionar Microserviço(s)"
            >
              <Box className="w-3 h-3" />
              <span>+ REST</span>
            </button>
          )}
          
          <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
          
          {isRenamable && (
            <button 
              onClick={handleRename}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Renomear"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </NodeToolbar>
      )}
      
      {/* For standalone DBs (Legacy), just show delete/edit */}
      {isStandaloneDB && (
         <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
           <button 
            onClick={handleRename}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title="Renomear"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
         </NodeToolbar>
      )}

      <div className={getStyles()} onDoubleClick={() => isRenamable && setIsEditing(true)}>
        
        {/* Handles on all 4 sides with specific IDs to allows distinct routing */}
        <Handle type="target" position={Position.Left} id="t-left" className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-500" />
        <Handle type="source" position={Position.Left} id="s-left" className="w-2 h-2 !bg-transparent top-[30%]" />

        <Handle type="source" position={Position.Right} id="s-right" className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-500" />
        <Handle type="target" position={Position.Right} id="t-right" className="w-2 h-2 !bg-transparent top-[70%]" />
        
        <Handle type="target" position={Position.Top} id="t-top" className="w-2 h-2 !bg-transparent left-[30%]" />
        <Handle type="source" position={Position.Top} id="s-top" className="w-2 h-2 !bg-transparent left-[70%]" />
        
        <Handle type="source" position={Position.Bottom} id="s-bottom" className="w-2 h-2 !bg-transparent left-[30%]" />
        <Handle type="target" position={Position.Bottom} id="t-bottom" className="w-2 h-2 !bg-transparent left-[70%]" />

        <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-full">
          {getIcon()}
        </div>
        
        <div className="text-center w-full z-10 mb-1">
          {isEditing && isRenamable ? (
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={onSubmitLabel}
              onKeyDown={handleKeyDown}
              className="w-full text-center text-xs font-bold bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0.5 outline-none text-slate-900 dark:text-slate-100 nodrag"
            />
          ) : (
            <h3 
              className={`font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight break-words px-1 ${isRenamable ? 'cursor-text' : ''}`} 
              title={isRenamable ? "Duplo clique para editar" : ""}
            >
              {label}
            </h3>
          )}
          <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 font-semibold">
            {data.type}
          </p>
        </div>

        {/* Internal Databases List */}
        {databases.length > 0 && (
          <div className="w-full pt-1 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-300">
             {databases.map((db) => (
                 <div key={db.id} className="relative group w-full">
                     {editingDbId === db.id ? (
                        <input
                            ref={dbInputRef}
                            value={dbLabel}
                            onChange={(e) => setDbLabel(e.target.value)}
                            onBlur={onSubmitDbLabel}
                            onKeyDown={handleDbKeyDown}
                             className="w-full text-center text-[9px] font-bold bg-white dark:bg-slate-700 border border-amber-400 rounded px-1 py-0.5 outline-none text-slate-900 dark:text-slate-100 nodrag"
                        />
                     ) : (
                        <div 
                            onDoubleClick={(e) => startEditingDb(e, db.id, db.label)}
                            className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md w-full justify-center hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                            title="Duplo clique para renomear"
                        >
                            <Database className="w-2.5 h-2.5 shrink-0" />
                            <span className="text-[9px] font-bold truncate max-w-[100px]">{db.label}</span>
                        </div>
                     )}
                     
                     {!editingDbId && (
                         <button 
                            onClick={(e) => handleDeleteDb(e, db.id)}
                            className="absolute -right-1 -top-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                            title="Remover Banco"
                         >
                             <X className="w-2 h-2" />
                         </button>
                     )}
                 </div>
             ))}
          </div>
        )}
      </div>
    </>
  );
};

export default memo(CustomNode);