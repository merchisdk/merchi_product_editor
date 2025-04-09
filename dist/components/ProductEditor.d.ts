import React from 'react';
import { Product, Variation, Job } from '../types';
import '../styles/ProductEditor.css';
declare const Product: React.FC;
interface ProductEditorProps {
    children: React.ReactNode;
    product: Product;
    width?: number;
    height?: number;
    job: Job;
    onSave: () => void;
    onCancel: () => void;
    variations: Variation[];
    groupVariations: Variation[];
}
declare const ProductEditor: React.FC<ProductEditorProps>;
export default ProductEditor;
