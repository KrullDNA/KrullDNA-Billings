// Block type definitions and default props

export const BLOCK_TYPES = [
  { type: 'header_block', label: 'Header', icon: 'H', desc: 'Logo + business info' },
  { type: 'client_block', label: 'Client', icon: 'C', desc: 'Bill-to section' },
  { type: 'doc_title_block', label: 'Document Title', icon: 'T', desc: 'Invoice/Estimate title' },
  { type: 'line_items_block', label: 'Line Items', icon: 'L', desc: 'Items grouped by category' },
  { type: 'totals_block', label: 'Totals', icon: '$', desc: 'Subtotal, tax, total' },
  { type: 'notes_block', label: 'Notes', icon: 'N', desc: 'Payment instructions' },
  { type: 'divider_block', label: 'Divider', icon: '—', desc: 'Horizontal rule' },
  { type: 'spacer_block', label: 'Spacer', icon: '↕', desc: 'Vertical whitespace' },
  { type: 'text_block', label: 'Text', icon: 'A', desc: 'Custom text' },
  { type: 'footer_block', label: 'Footer', icon: 'F', desc: 'Banking + business info' },
];

export function getDefaultProps(type) {
  const defaults = {
    header_block: { showLogo: true, showBusinessName: true, showAbn: true, showContact: true, bgColor: '#ffffff', textColor: '#111827', logoAlign: 'left', paddingTop: 32, paddingBottom: 16 },
    client_block: { sectionLabel: 'BILL TO', showPhone: false, showEmail: true, fontSize: 12, paddingTop: 0, paddingBottom: 16 },
    doc_title_block: { titleLabel: 'TAX INVOICE', showNumber: true, showDate: true, showDueDate: true, paddingTop: 0, paddingBottom: 16 },
    line_items_block: { headerBg: '#f9fafb', headerText: '#374151', categoryBg: '#4263eb', categoryText: '#ffffff', showTaxCol: true, alternateRows: true, fontSize: 11, paddingTop: 0, paddingBottom: 8 },
    totals_block: { alignment: 'right', showSubtotal: true, showMarkup: true, showDiscount: true, showTax: true, showRetainer: true, highlightTotal: true, paddingTop: 8, paddingBottom: 16 },
    notes_block: { sectionLabel: 'NOTES', fontSize: 10, showIfEmpty: false, paddingTop: 0, paddingBottom: 16 },
    divider_block: { weight: 1, color: '#e5e7eb', widthPct: 100, paddingTop: 0, paddingBottom: 8 },
    spacer_block: { height: 24, paddingTop: 0, paddingBottom: 0 },
    text_block: { content: 'Custom text here', fontSize: 12, bold: false, color: '#374151', alignment: 'left', paddingTop: 0, paddingBottom: 8 },
    footer_block: { defaultTerms: 'COD', paddingTop: 16, paddingBottom: 0 },
  };
  return { ...defaults[type] };
}

let _counter = 0;
export function createBlock(type) {
  _counter++;
  return { id: `new_${type}_${Date.now()}_${_counter}`, type, props: getDefaultProps(type) };
}
