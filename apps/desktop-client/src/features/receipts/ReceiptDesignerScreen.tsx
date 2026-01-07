import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Save,
  Trash2,
  Copy,
  Eye,
  Settings,
  Type,
  Image,
  Hash,
  List,
  Calculator,
  Minus,
  QrCode,
  Barcode,
  MoveUp,
  MoveDown,
  Check,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { ReceiptPreview } from './ReceiptPreview';
import { 
  ReceiptTemplate, 
  ReceiptComponent, 
  DEFAULT_RECEIPT_TEMPLATE,
  DYNAMIC_FIELDS,
  CONDITION_OPTIONS,
} from './types';

const COMPONENT_TYPES = [
  { type: 'text', label: 'Text Block', icon: Type },
  { type: 'field', label: 'Dynamic Field', icon: Hash },
  { type: 'logo', label: 'Store Logo', icon: Image },
  { type: 'items', label: 'Item List', icon: List },
  { type: 'totals', label: 'Totals Section', icon: Calculator },
  { type: 'divider', label: 'Divider Line', icon: Minus },
  { type: 'spacer', label: 'Spacer', icon: MoveDown },
  { type: 'qrcode', label: 'QR Code', icon: QrCode },
  { type: 'barcode', label: 'Barcode', icon: Barcode },
] as const;

export const ReceiptDesignerScreen: React.FC = () => {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ReceiptTemplate | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAddComponent, setShowAddComponent] = useState(false);

  // Load templates from localStorage
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const saved = localStorage.getItem('pulse-receipt-templates');
        if (saved) {
          const parsed = JSON.parse(saved);
          setTemplates(parsed);
          // Set active to default or first
          const defaultTemplate = parsed.find((t: ReceiptTemplate) => t.isDefault) || parsed[0];
          if (defaultTemplate) {
            setActiveTemplate(defaultTemplate);
          }
        } else {
          // Initialize with default template
          setTemplates([DEFAULT_RECEIPT_TEMPLATE]);
          setActiveTemplate(DEFAULT_RECEIPT_TEMPLATE);
          localStorage.setItem('pulse-receipt-templates', JSON.stringify([DEFAULT_RECEIPT_TEMPLATE]));
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        setTemplates([DEFAULT_RECEIPT_TEMPLATE]);
        setActiveTemplate(DEFAULT_RECEIPT_TEMPLATE);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const saveTemplates = useCallback((updatedTemplates: ReceiptTemplate[]) => {
    localStorage.setItem('pulse-receipt-templates', JSON.stringify(updatedTemplates));
    setTemplates(updatedTemplates);
  }, []);

  const handleSaveTemplate = async () => {
    if (!activeTemplate) return;
    
    setSaving(true);
    try {
      const updated = {
        ...activeTemplate,
        updatedAt: new Date().toISOString(),
      };
      
      const updatedTemplates = templates.map(t => 
        t.id === activeTemplate.id ? updated : t
      );
      
      saveTemplates(updatedTemplates);
      setActiveTemplate(updated);
      toast.success('Template saved successfully');
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = () => {
    const newTemplate: ReceiptTemplate = {
      id: crypto.randomUUID(),
      name: `Template ${templates.length + 1}`,
      paperWidth: '80mm',
      components: [...DEFAULT_RECEIPT_TEMPLATE.components.map(c => ({ ...c, id: crypto.randomUUID() }))],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedTemplates = [...templates, newTemplate];
    saveTemplates(updatedTemplates);
    setActiveTemplate(newTemplate);
    toast.success('New template created');
  };

  const handleDuplicateTemplate = () => {
    if (!activeTemplate) return;
    
    const duplicated: ReceiptTemplate = {
      ...activeTemplate,
      id: crypto.randomUUID(),
      name: `${activeTemplate.name} (Copy)`,
      isDefault: false,
      components: activeTemplate.components.map(c => ({ ...c, id: crypto.randomUUID() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedTemplates = [...templates, duplicated];
    saveTemplates(updatedTemplates);
    setActiveTemplate(duplicated);
    toast.success('Template duplicated');
  };

  const handleDeleteTemplate = () => {
    if (!activeTemplate || templates.length <= 1) {
      toast.error('Cannot delete the only template');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    const updatedTemplates = templates.filter(t => t.id !== activeTemplate.id);
    saveTemplates(updatedTemplates);
    setActiveTemplate(updatedTemplates[0]);
    setSelectedComponentId(null);
    toast.success('Template deleted');
  };

  const handleSetDefault = () => {
    if (!activeTemplate) return;
    
    const updatedTemplates = templates.map(t => ({
      ...t,
      isDefault: t.id === activeTemplate.id,
    }));
    
    saveTemplates(updatedTemplates);
    setActiveTemplate({ ...activeTemplate, isDefault: true });
    toast.success('Default template updated');
  };

  const handleAddComponent = (type: string) => {
    if (!activeTemplate) return;
    
    const newComponent: ReceiptComponent = {
      id: crypto.randomUUID(),
      type: type as ReceiptComponent['type'],
      alignment: 'left',
      fontSize: 'normal',
    };
    
    // Set default content based on type
    if (type === 'text') {
      newComponent.content = 'New text block';
    } else if (type === 'field') {
      newComponent.field = 'store_name';
    } else if (type === 'spacer') {
      newComponent.height = 10;
    }
    
    const updatedTemplate = {
      ...activeTemplate,
      components: [...activeTemplate.components, newComponent],
    };
    
    setActiveTemplate(updatedTemplate);
    setSelectedComponentId(newComponent.id);
    setShowAddComponent(false);
  };

  const handleUpdateComponent = (id: string, updates: Partial<ReceiptComponent>) => {
    if (!activeTemplate) return;
    
    const updatedComponents = activeTemplate.components.map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    
    setActiveTemplate({
      ...activeTemplate,
      components: updatedComponents,
    });
  };

  const handleDeleteComponent = (id: string) => {
    if (!activeTemplate) return;
    
    const updatedComponents = activeTemplate.components.filter(c => c.id !== id);
    
    setActiveTemplate({
      ...activeTemplate,
      components: updatedComponents,
    });
    
    setSelectedComponentId(null);
  };

  const handleMoveComponent = (id: string, direction: 'up' | 'down') => {
    if (!activeTemplate) return;
    
    const index = activeTemplate.components.findIndex(c => c.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activeTemplate.components.length) return;
    
    const updatedComponents = [...activeTemplate.components];
    [updatedComponents[index], updatedComponents[newIndex]] = 
    [updatedComponents[newIndex], updatedComponents[index]];
    
    setActiveTemplate({
      ...activeTemplate,
      components: updatedComponents,
    });
  };

  const selectedComponent = activeTemplate?.components.find(c => c.id === selectedComponentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Receipt Designer</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Customize your receipt templates
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showPreview 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </button>
            
            <button
              onClick={handleSaveTemplate}
              disabled={saving || !activeTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="font-medium">Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Templates & Components */}
        <div className="w-72 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
          {/* Template Selector */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Templates</h3>
              <button
                onClick={handleCreateTemplate}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="New Template"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <select
              value={activeTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find(t => t.id === e.target.value);
                if (template) {
                  setActiveTemplate(template);
                  setSelectedComponentId(null);
                }
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
            >
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            
            {activeTemplate && (
              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={handleDuplicateTemplate}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
                <button
                  onClick={handleSetDefault}
                  disabled={activeTemplate.isDefault}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  Set Default
                </button>
                <button
                  onClick={handleDeleteTemplate}
                  className="flex items-center justify-center px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Template Settings */}
          {activeTemplate && (
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={activeTemplate.name}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Paper Width</label>
                  <select
                    value={activeTemplate.paperWidth}
                    onChange={(e) => setActiveTemplate({ ...activeTemplate, paperWidth: e.target.value as '58mm' | '80mm' })}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded"
                  >
                    <option value="58mm">58mm (Narrow)</option>
                    <option value="80mm">80mm (Standard)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Components List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Components</h3>
              <div className="relative">
                <button
                  onClick={() => setShowAddComponent(!showAddComponent)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                
                {showAddComponent && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-10">
                    {COMPONENT_TYPES.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => handleAddComponent(type)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              {activeTemplate?.components.map((component, index) => (
                <div
                  key={component.id}
                  onClick={() => setSelectedComponentId(component.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedComponentId === component.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <GripVertical className="w-3 h-3 text-gray-400" />
                  <span className="text-xs flex-1 truncate">
                    {component.type === 'text' ? component.content?.substring(0, 20) || 'Text' :
                     component.type === 'field' ? DYNAMIC_FIELDS.find(f => f.id === component.field)?.label || component.field :
                     COMPONENT_TYPES.find(t => t.type === component.type)?.label || component.type}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveComponent(component.id, 'up'); }}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveComponent(component.id, 'down'); }}
                      disabled={index === activeTemplate.components.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Component Editor */}
        <div className="flex-1 bg-white dark:bg-slate-800 overflow-y-auto p-6">
          {selectedComponent ? (
            <ComponentEditor
              component={selectedComponent}
              onUpdate={(updates) => handleUpdateComponent(selectedComponent.id, updates)}
              onDelete={() => handleDeleteComponent(selectedComponent.id)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Select a component to edit</p>
              <p className="text-sm">or add a new one from the sidebar</p>
            </div>
          )}
        </div>

        {/* Right - Live Preview */}
        {showPreview && activeTemplate && (
          <div className="w-96 bg-gray-100 dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 p-6 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">Live Preview</h3>
            <div className="flex justify-center">
              <ReceiptPreview template={activeTemplate} scale={0.85} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Component Editor Panel
interface ComponentEditorProps {
  component: ReceiptComponent;
  onUpdate: (updates: Partial<ReceiptComponent>) => void;
  onDelete: () => void;
}

const ComponentEditor: React.FC<ComponentEditorProps> = ({ component, onUpdate, onDelete }) => {
  const componentTypeInfo = COMPONENT_TYPES.find(t => t.type === component.type);
  const Icon = componentTypeInfo?.icon || FileText;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {componentTypeInfo?.label || 'Component'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Edit component properties
            </p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Text Content */}
        {component.type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Text Content
            </label>
            <textarea
              value={component.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
              placeholder="Enter text..."
            />
          </div>
        )}

        {/* Dynamic Field Selector */}
        {component.type === 'field' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Field
            </label>
            <select
              value={component.field || ''}
              onChange={(e) => onUpdate({ field: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
            >
              {Object.entries(
                DYNAMIC_FIELDS.reduce((acc, field) => {
                  if (!acc[field.category]) acc[field.category] = [];
                  acc[field.category].push(field);
                  return acc;
                }, {} as Record<string, typeof DYNAMIC_FIELDS>)
              ).map(([category, fields]) => (
                <optgroup key={category} label={category}>
                  {fields.map(field => (
                    <option key={field.id} value={field.id}>{field.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {/* Spacer Height */}
        {component.type === 'spacer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Height (px)
            </label>
            <input
              type="number"
              value={component.height || 10}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 10 })}
              min={5}
              max={50}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
            />
          </div>
        )}

        {/* Alignment */}
        {!['divider', 'items', 'totals'].includes(component.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Alignment
            </label>
            <div className="flex gap-2">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdate({ alignment: align as ReceiptComponent['alignment'] })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    component.alignment === align
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Font Size */}
        {['text', 'field'].includes(component.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Font Size
            </label>
            <select
              value={component.fontSize || 'normal'}
              onChange={(e) => onUpdate({ fontSize: e.target.value as ReceiptComponent['fontSize'] })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra Large</option>
            </select>
          </div>
        )}

        {/* Text Style */}
        {['text', 'field'].includes(component.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Style
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate({ bold: !component.bold })}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                  component.bold
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                Bold
              </button>
              <button
                onClick={() => onUpdate({ italic: !component.italic })}
                className={`flex-1 py-2 px-3 rounded-lg text-sm italic transition-colors ${
                  component.italic
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                Italic
              </button>
              <button
                onClick={() => onUpdate({ underline: !component.underline })}
                className={`flex-1 py-2 px-3 rounded-lg text-sm underline transition-colors ${
                  component.underline
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}
              >
                Underline
              </button>
            </div>
          </div>
        )}

        {/* Conditional Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Show When
          </label>
          <select
            value={component.showIf || ''}
            onChange={(e) => onUpdate({ showIf: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
          >
            {CONDITION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDesignerScreen;
