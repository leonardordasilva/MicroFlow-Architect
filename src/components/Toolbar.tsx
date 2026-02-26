import { useCallback } from 'react';
import {
  Box, Database, Mail, Globe, Trash2, Undo2, Redo2, LayoutGrid,
  Download, Upload, Image, Sparkles, Brain, Moon, Sun, ChevronDown, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NodeType } from '@/types/diagram';

interface ToolbarProps {
  onAddNode: (type: NodeType, subType?: string) => void;
  onDelete: () => void;
  onClearCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: (engine: string, direction: string) => void;
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

function DatabaseDropdown({ onSelect }: { onSelect: (subType: string) => void }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Database className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 ml-[-2px]" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Banco de Dados</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="z-50">
        <DropdownMenuItem onClick={() => onSelect('Oracle')}>Oracle</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('Redis')}>Redis</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Toolbar({
  onAddNode, onDelete, onClearCanvas, onUndo, onRedo, onAutoLayout,
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
      <DatabaseDropdown onSelect={(subType) => onAddNode('database', subType)} />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Mail className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 ml-[-2px]" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Fila / Mensageria</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="z-50">
          <DropdownMenuItem onClick={() => onAddNode('queue', 'MQ')}>MQ</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddNode('queue', 'Kafka')}>Kafka</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddNode('queue', 'AMQP')}>AMQP</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 ml-[-2px]" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">API / Protocolo</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="z-50">
          <DropdownMenuItem onClick={() => onAddNode('external', 'REST')}>REST</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddNode('external', 'gRPC')}>gRPC</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddNode('external', 'GraphQL')}>GraphQL</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddNode('external', 'WebSocket')}>WebSocket</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddNode('external', 'HTTPS')}>HTTPS</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6" />

      <ToolbarButton icon={Trash2} label="Deletar (Del)" onClick={onDelete} />
      <ToolbarButton icon={XCircle} label="Limpar Diagrama" onClick={onClearCanvas} />
      <ToolbarButton icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={onUndo} />
      <ToolbarButton icon={Redo2} label="Refazer (Ctrl+Y)" onClick={onRedo} />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <LayoutGrid className="h-4 w-4" />
                <ChevronDown className="h-3 w-3 ml-[-2px]" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Auto Layout</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="z-50">
          <DropdownMenuItem onClick={() => onAutoLayout('elk', 'LR')}>ELK — Esquerda → Direita</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoLayout('elk', 'TB')}>ELK — Cima → Baixo</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoLayout('dagre', 'LR')}>Dagre — Horizontal</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoLayout('dagre', 'TB')}>Dagre — Vertical</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
