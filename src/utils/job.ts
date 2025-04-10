import {
  FieldType,
  Product,
  Variation,
  VariationField,
  VariationFieldsOption,
  DraftTemplate
} from '../types';
import { fabric } from 'fabric';
import {
  addTextToCanvas,
  addFilesToCanvas,
} from './canvasUtils';

export function findTemplatesSelectedByVarations(draftTemplates: DraftTemplate[], variations: Variation[]) {
  // filter all the selected variation values
  const selectedVarationValues: string[] = variations.map((v: Variation) => String(v.value));

  // return all the draft templates that have a selectedByVariationFieldOptions that includes
  // any of the selected variation values
  return draftTemplates.filter((template: DraftTemplate) => {
    if (!template?.selectedByVariationFieldOptions) {
      return false;
    }
    return !!template.selectedByVariationFieldOptions?.find(
      (o: VariationFieldsOption) => selectedVarationValues.includes(String(o.id))
    );
  });
}

export function filterVariationsByTemplate(variations: Variation[], template: DraftTemplate) {
  // filter the variations by the template and only return the variations which edit the template
  // we will use these variations to add canvas objects to the canvas
  const editFieldIds = template.editedByVariationFields?.map((field: VariationField) => field.id);
  return variations.filter(
    (v: Variation) => editFieldIds?.includes(v.variationField?.id)
  );
}

export function buildVariationFieldCanvasObject(variation: Variation) {
  // takes a variation and returns an associated canvas object to redner
  const { value, variationField, variationFiles = [] } = variation;
  const { fieldType = FieldType.TEXT_INPUT, id } = variationField || {};
  if ([FieldType.TEXT_INPUT, FieldType.TEXT_AREA, FieldType.NUMBER_INPUT].includes(fieldType)) {
    // Used to add a text to the canvas
    return {
      canvasObjectType: 'text',
      value,
      fieldId: id,
      text: value,
      fontSize: 24,
      fontFamily: 'Nunito'
    };
  }
  if (fieldType === FieldType.FILE_UPLOAD) {
    // Used to add an image to the canvas
    return {
      canvasObjectType: 'image',
      fieldId: id,
      value,
      files: variationFiles,
    };
  }
  if ([FieldType.COLOUR_PICKER, FieldType.COLOUR_SELECT].includes(fieldType)) {
    // Used to add a colour to the canvas
    return {
      canvasObjectType: 'colour',
      fieldId: id,
      value,
      colour: value,
    };
  }
  return {
    fieldId: id,
    value,
  };
}

export function canvasTemplateVariationObjects(variations: Variation[], template: DraftTemplate) {
  // takes a list of variations and a template and returns a list of canvas objects to render
  const templateVariations = filterVariationsByTemplate(variations, template);
  return templateVariations.map((v: Variation) => buildVariationFieldCanvasObject(v));
}

export function initDraftTemplates(variations: Variation[], product: Product) {
  const { draftTemplates = [] } = product;
  console.log('Initializing draft templates from product:', { 
    productTemplates: draftTemplates.length,
    variations: variations.length 
  });
  
  // Check for any templates that are selected by the variation options
  const templates = findTemplatesSelectedByVarations(draftTemplates, variations) || [];
  console.log('Templates selected by variations:', templates.length);

  // If there are no templates selected, return the draft templates
  const useTemplates = templates.length ? templates : draftTemplates;
  console.log('Using templates:', useTemplates.length);
  
  return useTemplates.map((template: DraftTemplate) => {
    // find the variations which edit the template
    const templateVariations = filterVariationsByTemplate(variations, template);
    // build the canvas objects for the template
    const variationObjects = canvasTemplateVariationObjects(templateVariations, template);
    return {
      template,
      variationObjects,
    };
  });
}

export function addVariationsToCanvas(canvas: fabric.Canvas, variations: Variation[], template: DraftTemplate) {
  // takes a canvas and a list of canvas objects and adds them to the canvas
  const variationObjects = canvasTemplateVariationObjects(variations, template);
  variationObjects.forEach((object: any) => {
    if (object.canvasObjectType === 'text') {
      addTextToCanvas(canvas, template.width || 800, template.height || 600, object.text, object.fontSize, object.fontFamily);
    }
    if (object.canvasObjectType === 'image') {
      addFilesToCanvas(canvas, object.files, object.width, object.height);
    }
    if (object.canvasObjectType === 'colour') {
      canvas.add(object);
    }
  });
}
