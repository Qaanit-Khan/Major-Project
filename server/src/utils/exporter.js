const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

/**
 * Generate CSV buffer from rows array
 */
function generateCSV(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Generate XLSX buffer from rows array and sheet name
 */
function generateXLSX(rows, sheetName = 'Export') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate PDF buffer using PDFKit with ARB Softech visual branding
 */
function generatePDF(title, columns, rows) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: columns.length > 6 ? 'A4' : 'A4',
        layout: columns.length > 6 ? 'landscape' : 'portrait',
      });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Header Banner
      doc.rect(36, 36, doc.page.width - 72, 4).fill('#D6536D');
      doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#2B2321')
        .text('ARB Softech AI Voice Agent', 36, 48);

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#8A7B72')
        .text(`${title} · Generated on ${new Date().toLocaleString()}`, 36, 70);

      doc
        .fontSize(10)
        .fillColor('#8A7B72')
        .text(`Total Records: ${rows.length}`, 36, 86);

      doc.moveDown(1.5);

      const tableTop = 110;
      const printableWidth = doc.page.width - 72;
      const colWidth = Math.floor(printableWidth / columns.length);

      // Table Header
      const headerY = tableTop;
      doc.rect(36, headerY, printableWidth, 22).fill('#FBF3EC');
      doc.fillColor('#2B2321').font('Helvetica-Bold').fontSize(9);

      columns.forEach((col, i) => {
        const x = 36 + i * colWidth + 4;
        doc.text(col.label, x, headerY + 6, { width: colWidth - 8, truncate: true });
      });

      // Table Rows
      let currentY = headerY + 24;
      doc.font('Helvetica').fontSize(8.5);

      rows.forEach((row, rowIndex) => {
        // Page break if near bottom
        if (currentY + 22 > doc.page.height - 36) {
          doc.addPage();
          currentY = 36;
          // Re-draw header on new page
          doc.rect(36, currentY, printableWidth, 20).fill('#FBF3EC');
          doc.fillColor('#2B2321').font('Helvetica-Bold').fontSize(9);
          columns.forEach((col, i) => {
            const x = 36 + i * colWidth + 4;
            doc.text(col.label, x, currentY + 5, { width: colWidth - 8, truncate: true });
          });
          currentY += 22;
          doc.font('Helvetica').fontSize(8.5);
        }

        // Alternating row background
        if (rowIndex % 2 === 1) {
          doc.rect(36, currentY, printableWidth, 20).fill('#FAF7F5');
        }

        doc.fillColor('#2B2321');
        columns.forEach((col, i) => {
          const val = row[col.key] != null ? String(row[col.key]) : '—';
          const x = 36 + i * colWidth + 4;
          doc.text(val, x, currentY + 5, { width: colWidth - 8, truncate: true });
        });

        currentY += 20;
      });

      // Footer
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#8A7B72')
          .text(
            `Page ${i + 1} of ${totalPages} · Confidential · ARB Softech Platform`,
            36,
            doc.page.height - 24,
            { align: 'center', width: doc.page.width - 72 }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Express helper to send export in requested format
 */
async function sendExport(res, format, filenameBase, columns, rows) {
  const safeFormat = (format || 'csv').toLowerCase();

  if (safeFormat === 'xlsx') {
    const buffer = generateXLSX(rows, filenameBase);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
    return res.send(buffer);
  }

  if (safeFormat === 'pdf') {
    const buffer = await generatePDF(filenameBase.replace(/_/g, ' ').toUpperCase(), columns, rows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
    return res.send(buffer);
  }

  // Default: CSV
  const csv = generateCSV(rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
  return res.send(csv);
}

module.exports = {
  generateCSV,
  generateXLSX,
  generatePDF,
  sendExport,
};
