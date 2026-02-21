import { useCallback, useRef } from 'react';
import {
  Box, Database, Mail, Globe, Trash2, Undo2, Redo2, LayoutGrid,
  Download, Upload, Image, Sparkles, Brain, FileText, Moon, Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NodeType } from '@/types/diagram';

interface ToolbarProps {
  onAddNode: (type: NodeType) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  onOpenAIGenerate: () => void;
  onOpenAIAnalyze: () => void;
  diagramName: string;
  onDiagramNameChange: (name: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  variant = 'ghost',
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'ghost' | 'outline' | 'default';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon" className="h-9 w-9" onClick={onClick}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function Toolbar({
  onAddNode, onDelete, onUndo, onRedo, onAutoLayout,
  onExportPNG, onExportJSON, onImportJSON,
  onOpenAIGenerate, onOpenAIAnalyze,
  diagramName, onDiagramNameChange,
  darkMode, onToggleDarkMode,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1.5 shadow-sm">
      <input
        className="w-40 bg-transparent px-2 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
        value={diagramName}
        onChange={(e) => onDiagramNameChange(e.target.value)}
        placeholder="Nome do diagrama"
      />

      <Separator orientation="vertical" className="h-6" />

      <ToolbarButton icon={Box} label="Microserviço" onClick={() => onAddNode('service')} />
      <ToolbarButton icon={Database} label="Oracle" onClick={() => onAddNode('database')} />
      <ToolbarButton icon={Mail} label="MQ" onClick={() => onAddNode('queue')} />
      <ToolbarButton icon={Globe} label="REST" onClick={() => onAddNode('external')} />

      <Separator orientation="vertical" className="h-6" />

      <ToolbarButton icon={Trash2} label="Deletar (Del)" onClick={onDelete} />
      <ToolbarButton icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={onUndo} />
      <ToolbarButton icon={Redo2} label="Refazer (Ctrl+Y)" onClick={onRedo} />
      <ToolbarButton icon={LayoutGrid} label="Auto Layout" onClick={onAutoLayout} />

      <Separator orientation="vertical" className="h-6" />

      <ToolbarButton icon={Image} label="Exportar PNG" onClick={onExportPNG} />
      <ToolbarButton icon={Download} label="Exportar JSON" onClick={onExportJSON} />
      <ToolbarButton icon={Upload} label="Importar JSON" onClick={onImportJSON} />

      <Separator orientation="vertical" className="h-6" />

      <ToolbarButton icon={Sparkles} label="Gerar com IA" onClick={onOpenAIGenerate} variant="outline" />
      <ToolbarButton icon={Brain} label="Analisar Arquitetura" onClick={onOpenAIAnalyze} variant="outline" />

      <Separator orientation="vertical" className="h-6" />

      <ToolbarButton
        icon={darkMode ? Sun : Moon}
        label={darkMode ? 'Modo Claro' : 'Modo Escuro'}
        onClick={onToggleDarkMode}
      />
    </div>
  );
}
