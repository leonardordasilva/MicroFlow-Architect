import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from 'reactflow';
import { Database, Mail, Box, Globe, ArrowRight, Trash2, Edit3, PlusSquare, X, Network } from 'lucide-react';
import { CustomNodeData, NodeType } from '../types';

const CustomNode = ({ data, selected, id }: NodeProps<CustomNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null); // Track which DB or Service is being edited
  const [label, setLabel] = useState(data.label);
  const [itemLabel, setItemLabel] = useState(""); 
  
  const inputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);

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
    if (editingItemId && itemInputRef.current) {
      itemInputRef.current.focus();
      itemInputRef.current.select();
    }
  }, [editingItemId]);

  const onSubmitLabel = () => {
    setIsEditing(false);
    if (data.onLabelChange && label.trim() !== "") {
      data.onLabelChange(label);
    } else {
      setLabel(data.label); // Revert if empty
    }
  };

  const onSubmitItemLabel = () => {
    if (!editingItemId) return;
    
    if (itemLabel.trim() !== "") {
        // Try renaming Database first
        if (data.databases?.some(db => db.id === editingItemId) && data.onRenameDatabase) {
             data.onRenameDatabase(editingItemId, itemLabel);
        }
        // Try renaming Service
        else if (data.services?.some(svc => svc.id === editingItemId) && data.onRenameService) {
             data.onRenameService(editingItemId, itemLabel);
        }
    }
    setEditingItemId(null);
  };

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter') {
      onSubmitLabel();
    } else if (evt.key === 'Escape') {
      setIsEditing(false);
      setLabel(data.label);
    }
  };

  const handleItemKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter') {
      onSubmitItemLabel();
    } else if (evt.key === 'Escape') {
      setEditingItemId(null);
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

  const getStyles = () => {
    let base = "bg-white dark:bg-slate-800 shadow-xl rounded-xl p-3 w-44 flex flex-col items-center transition-all duration-200 relative h-auto z-10";
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) data.onDelete();
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };
  
  const startEditingItem = (e: React.MouseEvent, id: string, currentLabel: string) => {
    e.stopPropagation();
    setItemLabel(currentLabel);
    setEditingItemId(id);
  };

  const handleDeleteDb = (e: React.MouseEvent, dbId: string) => {
    e.stopPropagation();
    if (data.onDeleteDatabase) {
        data.onDeleteDatabase(dbId);
    }
  }

  const handleDeleteService = (e: React.MouseEvent, svcId: string) => {
    e.stopPropagation();
    if (data.onDeleteService) {
        data.onDeleteService(svcId);
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
  const services = data.services || [];

  // Visual dot style for handles
  const handleClass = "w-2.5 h-2.5 bg-slate-400 dark:bg-slate-500 border border-white dark:border-slate-800 z-50";

  return (
    <>
      {/* Context Toolbar - Visibility depends on node type rules */}
      {!isStandaloneDB && (
        <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
          
          {canAddQueue && (
            <button 
              onClick={(e) => handleAdd(e, NodeType.QUEUE, 'right')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
              title="Adicionar Fila IBM MQ"
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
        
        {/* Handles on ALL 4 sides */}
        <Handle type="source" position={Position.Left} id="left" style={{ top: '50%', left: -3 }} className={handleClass} />
        <Handle type="source" position={Position.Right} id="right" style={{ top: '50%', right: -3 }} className={handleClass} />
        <Handle type="source" position={Position.Top} id="top" style={{ left: '50%', top: -3 }} className={handleClass} />
        <Handle type="source" position={Position.Bottom} id="bottom" style={{ left: '50%', bottom: -3 }} className={handleClass} />

        {/* Main Icon */}
        <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full mb-1 z-20">
          {getIcon()}
        </div>
        
        {/* Main Label */}
        <div className="text-center w-full z-20 mb-2">
          {isEditing && isRenamable ? (
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={onSubmitLabel}
              onKeyDown={handleKeyDown}
              className="w-full text-center text-sm font-bold bg-white dark:bg-slate-700 border border-blue-400 rounded px-1 py-0.5 outline-none text-slate-900 dark:text-slate-100 nodrag"
            />
          ) : (
            <h3 
              className={`font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight break-words px-1 ${isRenamable ? 'cursor-text' : ''}`} 
              title={isRenamable ? "Duplo clique para editar" : ""}
            >
              {label}
            </h3>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            {data.type}
          </p>
        </div>

        {/* Internal Databases List */}
        {databases.length > 0 && (
          <div className="w-full flex flex-col items-center z-10">
             {/* Connector Line from Main Node to First DB */}
             <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-600"></div>
             
             <div className="flex flex-col gap-2 w-full">
               {databases.map((db, index) => (
                   <div key={db.id} className="flex flex-col items-center w-full">
                       {index > 0 && (
                          <div className="w-0.5 h-2 bg-slate-300 dark:bg-slate-600"></div>
                       )}
                       
                       <div className="relative group w-full z-20">
                           {editingItemId === db.id ? (
                              <div className="w-full bg-white dark:bg-slate-800 border-2 border-amber-400 rounded-md p-1">
                                  <input
                                      ref={itemInputRef}
                                      value={itemLabel}
                                      onChange={(e) => setItemLabel(e.target.value)}
                                      onBlur={onSubmitItemLabel}
                                      onKeyDown={handleItemKeyDown}
                                      className="w-full text-center text-[10px] font-bold bg-transparent outline-none text-slate-900 dark:text-slate-100 nodrag"
                                  />
                              </div>
                           ) : (
                              <div 
                                  onDoubleClick={(e) => startEditingItem(e, db.id, db.label)}
                                  className="relative flex items-center gap-2 px-3 py-2 w-full bg-white dark:bg-slate-800 border-2 border-amber-400 rounded-lg hover:border-amber-500 transition-all cursor-pointer shadow-sm"
                                  title="Database Interno (Duplo clique para renomear)"
                              >
                                  <Database className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate flex-1 text-left">
                                      {db.label}
                                  </span>
                                  
                                   <button 
                                      onClick={(e) => handleDeleteDb(e, db.id)}
                                      className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110 z-30"
                                      title="Remover Banco"
                                   >
                                       <X className="w-2 h-2" />
                                   </button>
                              </div>
                           )}
                       </div>
                   </div>
               ))}
             </div>
          </div>
        )}

        {/* Internal Services List */}
        {services.length > 0 && (
          <div className="w-full flex flex-col items-center z-10">
             {/* Connector Line from previous section */}
             <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-600"></div>

             <div className="flex flex-col gap-2 w-full">
               {services.map((svc, index) => (
                   <div key={svc.id} className="flex flex-col items-center w-full">
                       {index > 0 && (
                          <div className="w-0.5 h-2 bg-slate-300 dark:bg-slate-600"></div>
                       )}

                       <div className="relative group w-full z-20">
                           {editingItemId === svc.id ? (
                              <div className="w-full bg-white dark:bg-slate-800 border-2 border-blue-400 rounded-md p-1">
                                  <input
                                      ref={itemInputRef}
                                      value={itemLabel}
                                      onChange={(e) => setItemLabel(e.target.value)}
                                      onBlur={onSubmitItemLabel}
                                      onKeyDown={handleItemKeyDown}
                                      className="w-full text-center text-[10px] font-bold bg-transparent outline-none text-slate-900 dark:text-slate-100 nodrag"
                                  />
                              </div>
                           ) : (
                              <div 
                                  onDoubleClick={(e) => startEditingItem(e, svc.id, svc.label)}
                                  className="relative flex items-center gap-2 px-3 py-2 w-full bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-lg hover:border-blue-600 transition-all cursor-pointer shadow-sm"
                                  title="Serviço Interno (Duplo clique para renomear)"
                              >
                                  <Box className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate flex-1 text-left">
                                      {svc.label}
                                  </span>
                                  
                                   <button 
                                      onClick={(e) => handleDeleteService(e, svc.id)}
                                      className="absolute -right-2 -top-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110 z-30"
                                      title="Remover Serviço"
                                   >
                                       <X className="w-2 h-2" />
                                   </button>
                              </div>
                           )}
                       </div>
                   </div>
               ))}
             </div>
          </div>
        )}

      </div>
    </>
  );
};

export default memo(CustomNode);