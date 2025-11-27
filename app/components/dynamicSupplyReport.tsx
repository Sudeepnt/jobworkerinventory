'use client';

import { useMemo, useState, useEffect } from 'react';
import { Home, Download, FileSpreadsheet, Eye } from 'lucide-react';
import { getSupplyInvoices, getReceiptInvoices } from './lib/storage';
import { generatePDF } from './lib/pdf-utils';
import { exportToExcel } from './lib/excel-utils';

interface DynamicSupplyReportProps {
  onNavigate: (page: string) => void;
}

export default function DynamicSupplyReport({ onNavigate }: DynamicSupplyReportProps) {
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [supplyInvoices, setSupplyInvoices] = useState<any[]>([]);
  const [receiptInvoices, setReceiptInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [supplies, receipts] = await Promise.all([
        getSupplyInvoices(),
        getReceiptInvoices()
      ]);
      setSupplyInvoices(supplies);
      setReceiptInvoices(receipts);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredSupplyInvoices = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1week':
        startDate.setDate(now.getDate() - 7);
        break;
      case '15days':
        startDate.setDate(now.getDate() - 15);
        break;
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate);
        break;
    }

    const endDate = dateRange === 'custom' && customEndDate ? new Date(customEndDate) : now;

    return supplyInvoices.filter((s: any) => {
      const supplyDate = new Date(s.date);
      return supplyDate >= startDate && supplyDate <= endDate;
    });
  }, [supplyInvoices, dateRange, customStartDate, customEndDate]);

  const dynamicReportData = useMemo(() => {
    return filteredSupplyInvoices.map((supply: any) => {
      const receipts = receiptInvoices.filter((r: any) => r.supplyInvoiceId === supply.id);
      const originalQty = supply.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      let receivedQty = 0;
      receipts.forEach((receipt: any) => {
        receipt.items.forEach((item: any) => {
          receivedQty += item.finishedQuantity + item.damagedQuantity;
        });
      });
      const remainingQty = Math.max(originalQty - receivedQty, 0);

      return {
        id: supply.id,
        date: supply.date,
        invoiceNumber: supply.invoiceNumber,
        originalQty,
        remainingQty,
        receipts,
        items: supply.items,
      };
    });
  }, [filteredSupplyInvoices, receiptInvoices]);

  // Export Main List
  const handleExportPDF = () => {
    const data = dynamicReportData.map((item: any) => [
      new Date(item.date).toLocaleDateString(),
      item.invoiceNumber,
      Math.round(item.originalQty).toString(),
      Math.round(item.remainingQty).toString(),
    ]);
    generatePDF(
      'Dynamic Supply Bill',
      ['Date', 'Invoice Number', 'Original Quantity', 'Remaining Quantity'],
      data,
      `dynamic-supply-${Date.now()}.pdf`
    );
  };

  const handleExportExcel = () => {
    const data = dynamicReportData.map((item: any) => ({
      Date: new Date(item.date).toLocaleDateString(),
      'Invoice Number': item.invoiceNumber,
      'Original Quantity': Math.round(item.originalQty),
      'Remaining Quantity': Math.round(item.remainingQty),
    }));
    exportToExcel(data, `dynamic-supply-${Date.now()}.xlsx`, 'DynamicSupply');
  };

  // NEW: Export Single Dynamic Invoice Detail
  const handleSingleDynamicPDF = (invoice: any) => {
    const rows: string[][] = [];

    // Add Receipts details
    const sortedReceipts = [...invoice.receipts].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedReceipts.forEach((rec: any) => {
      rec.items.forEach((item: any) => {
        rows.push([
          new Date(rec.date).toLocaleDateString(),
          rec.receiptInvoiceNumber,
          item.goodsName,
          Math.round(item.finishedQuantity).toString(),
          Math.round(item.damagedQuantity).toString()
        ]);
      });
    });

    // Add Totals at the bottom
    rows.push(['', '', '', '', '']); // Spacer
    rows.push(['', 'ORIGINAL QTY', '', '', Math.round(invoice.originalQty).toString()]);
    rows.push(['', 'REMAINING STOCK', '', '', Math.round(invoice.remainingQty).toString()]);

    generatePDF(
      `Supply Status: ${invoice.invoiceNumber}`,
      ['Date', 'Receipt #', 'Goods', 'Finished', 'Damaged'],
      rows,
      `dynamic-supply-${invoice.invoiceNumber}.pdf`
    );
  };

  const invoicePreview = previewInvoiceId
    ? dynamicReportData.find((i: any) => i.id === previewInvoiceId)
    : null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Dynamic Supply Bill</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col gap-4 mb-4">
          <label className="block text-sm font-medium text-gray-700">Date Range</label>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setDateRange('today')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                dateRange === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('1week')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                dateRange === '1week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              1 Week
            </button>
            <button
              onClick={() => setDateRange('15days')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                dateRange === '15days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              15 Days
            </button>
            <button
              onClick={() => setDateRange('1month')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                dateRange === '1month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              1 Month
            </button>
            <button
              onClick={() => setDateRange('6months')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                dateRange === '6months'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              6 Month
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                dateRange === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Custom
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-4 mt-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Quantity</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {dynamicReportData.length > 0 ? (
              dynamicReportData.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setPreviewInvoiceId(item.id)}
                      className="text-blue-600 underline flex items-center gap-1 hover:text-blue-800"
                    >
                      {item.invoiceNumber}
                      <Eye className="w-4 h-4 ml-1" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(item.originalQty)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(item.remainingQty)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setPreviewInvoiceId(item.id)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      PDF Preview
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No supply invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {invoicePreview && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Dynamic Supply Bill PDF Preview
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Date</span>
              <div className="text-sm text-gray-800">{new Date(invoicePreview.date).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Invoice Number</span>
              <div className="text-sm text-gray-800">{invoicePreview.invoiceNumber}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Original Qty</span>
              <div className="font-bold text-gray-900 text-lg">{Math.round(invoicePreview.originalQty)}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Remaining Qty</span>
              <div className="font-bold text-green-700 text-lg">{Math.round(invoicePreview.remainingQty)}</div>
            </div>
          </div>
          
          <div className="mb-6">
            <span className="text-xs text-gray-500 uppercase font-bold mb-2 block">Receipt History</span>
            <div className="divide-y divide-gray-200 border rounded-lg overflow-hidden">
              {invoicePreview.receipts.length > 0 ? (
                invoicePreview.receipts
                  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((receipt: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white hover:bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-blue-700 text-sm">
                          {receipt.receiptInvoiceNumber}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(receipt.date).toLocaleDateString()}
                        </span>
                      </div>
                      {receipt.items.map((recItem: any, itemIdx: number) => (
                        <div key={itemIdx} className="text-sm text-gray-700 flex justify-between items-center pl-2 border-l-2 border-gray-200 mb-1">
                          <span>{recItem.goodsName}</span>
                          <div className="text-xs space-x-3">
                            <span className="text-green-700">Finished: <b>{Math.round(recItem.finishedQuantity)}</b></span>
                            <span className="text-red-600">Damaged: <b>{Math.round(recItem.damagedQuantity)}</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
              ) : (
                <div className="text-gray-500 text-sm py-4 text-center">No receipts recorded yet.</div>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleSingleDynamicPDF(invoicePreview)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Bill PDF
            </button>
            <button
              onClick={() => setPreviewInvoiceId(null)}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close Preview
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-400 text-right">
            Generated on: {new Date().toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}