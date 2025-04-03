export interface MerchiFile {
    id?: number;
    url?: string;
    name?: string;
}
export interface DraftPreviewLayer {
    id?: number;
    layerName?: string;
    draftPreview?: DraftPreview;
    draftTemplate?: DraftTemplate;
}
export interface DiscountGroup {
    id?: number;
}
export interface InventoryGroup {
    id?: number;
}
export interface InventoryUnitVariation {
    id?: number;
}
export interface CartItem {
    id?: number;
}
export interface VariationOption {
    id?: number;
}
export interface MatchingInventory {
    id?: number;
}
export interface FieldType {
    SELECT: string;
    CHECKBOX: string;
    RADIO: string;
    IMAGE_SELECT: string;
    COLOUR_SELECT: string;
}
export interface VariationField {
    id?: number;
    archived?: Date | null;
    position?: number;
    required?: boolean;
    independent?: boolean;
    name?: string;
    instructions?: string;
    placeholder?: string | null;
    defaultValue?: string;
    currency?: string;
    fieldType?: FieldType;
    margin?: number;
    variationCost?: number;
    variationCostDiscountGroup?: DiscountGroup | null;
    variationUnitCost?: number;
    buyUnitCost?: number;
    buyCost?: number;
    variationUnitCostDiscountGroup?: DiscountGroup | null;
    rows?: number;
    fieldMin?: number | null;
    fieldMax?: number | null;
    allowDecimal?: boolean;
    sellerProductEditable?: boolean;
    multipleSelect?: boolean;
    showFilePreview?: boolean;
    allowFileMultiple?: boolean;
    allowFileJpeg?: boolean;
    allowFileGif?: boolean;
    allowFilePdf?: boolean;
    allowFilePng?: boolean;
    allowFileAi?: boolean;
    product?: Product;
    inventoryGroup?: InventoryGroup;
    linkedInventoryGroup?: InventoryGroup;
    variations?: Variation[];
    options?: VariationFieldsOption[];
}
export interface VariationFieldsOption {
    id?: number;
    archived?: Date | null;
    value?: string | null;
    colour?: string | null;
    currency?: string;
    default?: boolean;
    include?: boolean;
    noInventory?: boolean;
    position?: number;
    variationCost?: number;
    variationCostDiscountGroup?: DiscountGroup | null;
    variationUnitCost?: number;
    buyUnitCost?: number;
    buyCost?: number;
    variationUnitCostDiscountGroup?: DiscountGroup | null;
    variationField?: VariationField | null;
    linkedFile?: MerchiFile | null;
    selectedByVariations?: Variation[];
    inventoryUnitVariations?: InventoryUnitVariation[];
}
export interface DraftPreview {
    id?: number;
    file?: MerchiFile;
    product?: Product;
    description?: string | null;
    name?: string | null;
    date?: Date | null;
    height?: number;
    width?: number;
    draftPreviewLayers?: DraftPreviewLayer[];
}
export interface DraftTemplate {
    id?: number;
    archived?: Date | null;
    date?: Date | null;
    description?: string;
    name?: string;
    height?: number;
    width?: number;
    file?: MerchiFile;
    design?: MerchiFile;
    product?: Product | null;
    job?: Job | null;
    selectedByVariationFieldOptions?: VariationFieldsOption[];
    editedByVariationFields?: VariationField[];
    draftPreviewLayers?: DraftPreviewLayer[];
}
export interface Product {
    id?: number;
    name?: string;
    description?: string | null;
    draftTemplates?: DraftTemplate[];
    images?: MerchiFile[];
}
export interface Draft {
    id?: number;
}
export interface CountryTax {
    id?: number;
}
export interface Domain {
    id?: number;
}
export interface Variation {
    id?: number;
    archived?: Date | null;
    value?: string | null;
    currency?: string;
    cost?: number;
    quantity?: number;
    onceOffCost?: number;
    unitCost?: number;
    unitCostTotal?: number;
    variationField?: VariationField;
    variationsGroup?: VariationsGroup | null;
    job?: Job | null;
    cartItem?: CartItem | null;
    variationFiles?: MerchiFile[];
    selectedOptions?: VariationOption[];
    selectableOptions?: VariationOption[];
}
export interface VariationsGroup {
    id?: number;
    archived?: Date | null;
    quantity?: number;
    groupCost?: number | null;
    job?: Job | null;
    cartItem?: CartItem | null;
    matchingInventory?: MatchingInventory | null;
    variations?: Variation[];
    inventoryCount?: number;
    inventorySufficient?: boolean;
}
export interface Job {
    id?: number;
    quantity?: number;
    currency?: string;
    jobInfoApprovedByClient?: boolean;
    costPerUnit?: number | null;
    cost?: number | null;
    taxAmount?: number | null;
    totalCost?: number | null;
    drafts?: Draft[];
    sharedDrafts?: Draft[];
    ownDrafts?: Draft[];
    product?: Product;
    taxType?: CountryTax | null;
    domain?: Domain;
    variationsGroups?: VariationsGroup[];
    variations?: Variation[];
}
export interface ProductEditorProps {
    job: Job;
    product: Product;
    width?: number;
    height?: number;
    onSave?: (editedImage: string) => void;
    onCancel?: () => void;
}
