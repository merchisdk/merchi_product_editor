export interface MerchiFile {
    id?: number;
    url?: string;
    name?: string;
}
export interface DraftTemplate {
    id?: number;
    name?: string;
    description?: string;
    width?: number;
    height?: number;
    file?: MerchiFile;
    product?: Product | null;
    job?: any | null;
}
export interface Product {
    id?: number;
    name?: string;
    description?: string | null;
    draftTemplates?: DraftTemplate[];
    images?: MerchiFile[];
}
export interface ProductEditorProps {
    product: Product;
    width?: number;
    height?: number;
    onSave?: (editedImage: string) => void;
    onCancel?: () => void;
}
