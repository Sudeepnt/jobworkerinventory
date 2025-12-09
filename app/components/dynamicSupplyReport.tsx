'use client';

import { useMemo, useState, useEffect } from 'react';
import { Home, Download, FileSpreadsheet, Eye, Search } from 'lucide-react';
import { getSupplyInvoices, getReceiptInvoices } from './lib/storage';
import { generatePDF } from './lib/pdf-utils';
import { exportToExcel } from './lib/excel-utils';
// Updated import
import { formatDate, formatDateTime } from './lib/date-utils';

interface DynamicSupplyReportProps {
  onNavigate: (page: string) => void;
}

export default function DynamicSupplyReport({ onNavigate }: DynamicSupplyReportProps) {
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
    now.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (dateRange) {
      case 'today':
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
        if (customStartDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
        }
        break;
    }

    const endDate = dateRange === 'custom' && customEndDate 
      ? new Date(new Date(customEndDate).setHours(23, 59, 59, 999)) 
      : now;

    return supplyInvoices.filter((s: any) => {
      const supplyDate = new Date(s.date);
      return supplyDate >= startDate && supplyDate <= endDate;
    });
  }, [supplyInvoices, dateRange, customStartDate, customEndDate]);

  const dynamicReportData = useMemo(() => {
    const baseData = filteredSupplyInvoices.map((supply: any) => {
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

    if (searchQuery.trim()) {
      return baseData.filter(item => 
        item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return baseData;
  }, [filteredSupplyInvoices, receiptInvoices, searchQuery]);

  const handleExportPDF = () => {
    const data = dynamicReportData.map((item: any) => [
      formatDate(item.date),
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
      Date: formatDate(item.date),
      'Invoice Number': item.invoiceNumber,
      'Original Quantity': Math.round(item.originalQty),
      'Remaining Quantity': Math.round(item.remainingQty),
    }));
    exportToExcel(data, `dynamic-supply-${Date.now()}.xlsx`, 'DynamicSupply');
  };

  const handleSingleDynamicPDF = (invoice: any) => {
    const rows: string[][] = [];

    const sortedReceipts = [...invoice.receipts].sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    sortedReceipts.forEach((rec: any) => {
      rec.items.forEach((item: any) => {
        rows.push([
          formatDate(rec.date),
          invoice.invoiceNumber,
          item.goodsName,
          Math.round(invoice.originalQty).toString(),
          Math.round(item.finishedQuantity).toString(),
          Math.round(item.damagedQuantity).toString(),
          Math.round(invoice.remainingQty).toString()
        ]);
      });
    });

    if (rows.length === 0) {
      rows.push([
        formatDate(invoice.date),
        invoice.invoiceNumber,
        "No Receipts Yet",
        Math.round(invoice.originalQty).toString(),
        "0",
        "0",
        Math.round(invoice.remainingQty).toString()
      ]);
    }

    generatePDF(
      `Supply Details: ${invoice.invoiceNumber}`,
      ['Date', 'Supply Inv No', 'Goods Name', 'Original Qty', 'Finished Qty', 'Damaged Qty', 'Remaining Qty'],
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
          <div className="flex flex-col md:flex-row gap-6 justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex gap-2 flex-wrap">
                {['today', '1week', '15days', '1month', '6months', 'custom'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDateRange(opt)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      dateRange === opt
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {opt === 'today' ? 'Today' : 
                     opt === '1week' ? '1 Week' : 
                     opt === '15days' ? '15 Days' : 
                     opt === '1month' ? '1 Month' : 
                     opt === '6months' ? '6 Month' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Invoice
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter invoice number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 block w-full border border-gray-300 rounded-lg py-2 px-4 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-4 mt-2 border-t border-gray-100 pt-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Quantity</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dynamicReportData.length > 0 ? (
                dynamicReportData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setPreviewInvoiceId(item.id)}
                        className="text-blue-600 underline flex items-center gap-1 hover:text-blue-800 font-medium"
                      >
                        {item.invoiceNumber}
                        <Eye className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{Math.round(item.originalQty)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{Math.round(item.remainingQty)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setPreviewInvoiceId(item.id)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    {searchQuery ? 'No matching invoices found' : 'No supply invoices found for this period'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {invoicePreview && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
            Dynamic Supply Bill PDF Preview
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Date</span>
              <div className="text-sm text-gray-800 mt-1">{formatDate(invoicePreview.date)}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Invoice Number</span>
              <div className="text-sm text-gray-800 mt-1">{invoicePreview.invoiceNumber}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Original Qty</span>
              <div className="font-bold text-gray-900 text-lg">{Math.round(invoicePreview.originalQty)}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Remaining Qty</span>
              <div className="font-bold text-green-600 text-lg">{Math.round(invoicePreview.remainingQty)}</div>
            </div>
          </div>
          
          <div className="mb-6">
            <span className="text-xs text-gray-500 uppercase font-bold mb-2 block">Receipt History</span>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Goods</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Finished</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Damaged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoicePreview.receipts.length > 0 ? (
                    invoicePreview.receipts
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((receipt: any) => (
                        receipt.items.map((recItem: any, itemIdx: number) => (
                          <tr key={`${receipt.id}-${itemIdx}`} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-blue-600 font-medium">{receipt.receiptInvoiceNumber}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{formatDate(receipt.date)}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{recItem.goodsName}</td>
                            <td className="px-4 py-2 text-sm text-gray-800 text-right">{Math.round(recItem.finishedQuantity)}</td>
                            <td className="px-4 py-2 text-sm text-red-600 text-right">{Math.round(recItem.damagedQuantity)}</td>
                          </tr>
                        ))
                      ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No receipts recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleSingleDynamicPDF(invoicePreview)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Download Bill PDF
            </button>
            <button
              onClick={() => setPreviewInvoiceId(null)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Close Preview
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-400 text-right">
            Generated on: {formatDateTime(new Date())}
          </div>
        </div>
      )}
    </div>
  );
}