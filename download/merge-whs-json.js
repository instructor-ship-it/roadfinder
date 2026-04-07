const fs = require('fs');

// Read the original file
const original = JSON.parse(fs.readFileSync('/home/z/my-project/roadfinder/public/library/summaries/whs-act-2020.json', 'utf8'));

// Read the new completeSections
const completeSections = JSON.parse(fs.readFileSync('/home/z/my-project/download/whs-completeSections.json', 'utf8'));

// Create the merged object
const merged = {
  title: original.title,
  abstract: original.abstract,
  keywords: original.keywords,
  targetAudience: original.targetAudience,
  completeSections: completeSections,
  keyRequirements: original.keyRequirements,
  complianceNotes: original.complianceNotes,
  lastUpdated: new Date().toISOString().split('T')[0],
  issuingAuthority: original.issuingAuthority,
  pages: original.pages,
  tgsDiagramsReferenced: original.tgsDiagramsReferenced,
  documentId: original.documentId,
  generatedAt: original.generatedAt,
  generatedBy: original.generatedBy,
  version: original.version,
  lastProcessed: new Date().toISOString(),
  relatedDocuments: original.relatedDocuments,
  pageOffset: 26,
  pageOffsetNote: "TOC page number + 26 = Physical PDF page number"
};

// Write the merged file
fs.writeFileSync('/home/z/my-project/roadfinder/public/library/summaries/whs-act-2020.json', JSON.stringify(merged, null, 2));

console.log('Merged file written successfully');
console.log('Total sections:', completeSections.length);
