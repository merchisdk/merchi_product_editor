export interface MerchiFile {
  id?: number;
  url?: string;
  name?: string;
  // Add other MerchiFile properties as needed
}

export interface DraftTemplate {
  id?: number;
  name?: string;
  description?: string;
  width?: number;
  height?: number;
  file?: MerchiFile;
  product?: Product | null;
  job?: any | null; // Replace 'any' with Job type if available
}

export interface Product {
  id?: number;
  name?: string;
  description?: string | null;
  draftTemplates?: DraftTemplate[];
  images?: MerchiFile[];
  // Add other Product properties as needed
}

export interface ProductEditorProps {
  product: Product;
  width?: number;
  height?: number;
  onSave?: (editedImage: string) => void;
  onCancel?: () => void;
} 
