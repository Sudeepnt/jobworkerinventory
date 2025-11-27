'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generatePDF(title: string, headers: string[], data: any[][], filename: string) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Add footer with date and time
  const pageCount = doc.internal.pages.length - 1;
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    14,
    pageHeight - 10
  );
  
  // Save the PDF
  doc.save(filename);
}

export function generateInvoicePDF(
  title: string,
  invoiceData: { [key: string]: any },
  items: any[][],
  filename: string
) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Invoice details
  let yPos = 35;
  doc.setFontSize(11);
  Object.entries(invoiceData).forEach(([key, value]) => {
    doc.text(`${key}: ${value}`, 14, yPos);
    yPos += 7;
  });
  
  // Items table
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Item', 'Quantity', 'Details']],
    body: items,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    14,
    pageHeight - 10
  );
  
  doc.save(filename);
}
