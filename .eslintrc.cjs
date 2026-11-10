/* ESLint per Nembo: script globali senza import, nomi condivisi in globals.json (tools/aggiorna-globals.py).
   Uso: python3 tools/aggiorna-globals.py && npx eslint@8.57.0 pdfgen.js sw.js js */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
  // librerie di vendor/ esposte come globali, più le API del browser che ESLint non conosce
  globals: Object.assign({ preact: 'readonly', preactHooks: 'readonly', htm: 'readonly', msal: 'readonly', SignaturePad: 'readonly',
    PDFLib: 'readonly', JSZip: 'readonly', ExcelJS: 'readonly', docx: 'readonly', BarcodeDetector: 'readonly',
    PdfGen: 'readonly' }, require('./globals.json')), // PdfGen: modulo di pdfgen.js (root.PdfGen)
  rules: { 'no-undef': 'error' },
  overrides: [
    { files: ['pdfgen.js'], env: { node: true } },          // funziona anche in Node per le prove
    { files: ['sw.js'], env: { serviceworker: true } },
  ],
};
