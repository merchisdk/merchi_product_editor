import React from 'react';
import { DraftTemplate } from '../types';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  templates: DraftTemplate[];
  selectedTemplate: string | null;
  onSelectTemplate: (templateId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
}) => {
  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <div className="template-buttons">
      {templates.map((template) => (
        <div
          key={template.id}
          className={`template-button ${selectedTemplate === template.id?.toString() ? 'selected' : ''}`}
          onClick={() => onSelectTemplate(template.id?.toString() || '')}
        >
          <span className="template-name">{template.name || `Template ${template.id}`}</span>
        </div>
      ))}
    </div>
  );
};

export default TemplateSelector; 
