export const haveDraftTemplatesChanged = (draftTemplates: any[], newDraftTemplates: any[]) => {
  // Checks to see if the draft templates have changed at all.

  // If length is different, templates have definitely changed
  if (draftTemplates.length !== newDraftTemplates.length) {
    return true;
  }
  
  // Compare template IDs to see if the set of templates has changed
  const currentTemplateIds = draftTemplates.map(dt => dt.template.id).sort().join(',');
  const newTemplateIds = newDraftTemplates.map(dt => dt.template.id).sort().join(',');
  
  if (currentTemplateIds !== newTemplateIds) {
    return true;
  }
  
  // If we want to be more thorough, we could also check if variation objects have changed
  // This is a simplified check - a deep comparison would be more accurate but more expensive
  return false;
};