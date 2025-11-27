'use client';

import { useMemo, useState, useEffect } from 'react';
import { Home, Download, FileSpreadsheet, Eye } from 'lucide-react';
import { getSupplyInvoices } from './lib/storage';
import { generatePDF } from './lib/pdf-utils';
import { exportToExcel } from './lib/excel-utils';

interface OriginalSupplyReportProps {
  onNavigate: (page: string) => void;
}

export default function OriginalSupplyReport({ onNavigate }: OriginalSupplyReportProps) {
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [supplyInvoices, setSupplyInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const invoices = await getSupplyInvoices();
      setSupplyInvoices(invoices);
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

  // Export the whole list
  const handleExportListPDF = () => {
    const data = filteredSupplyInvoices.map((item: any) => [
      new Date(item.date).toLocaleDateString(),
      item.invoiceNumber,
      item.items.reduce((sum: number, i: any) => sum + i.quantity, 0)
    ]);
    generatePDF(
      'Original Supply Bill Report',
      ['Date', 'Invoice Number', 'Quantity'],
      data,
      `original-supply-bill-${Date.now()}.pdf`
    );
  };

  const handleExportExcel = () => {
    const data = filteredSupplyInvoices.map((item: any) => ({
      Date: new Date(item.date).toLocaleDateString(),
      'Invoice Number': item.invoiceNumber,
      Quantity: item.items.reduce((sum: number, i: any) => sum + i.quantity, 0)
    }));
    exportToExcel(data, `original-supply-bill-${Date.now()}.xlsx`, 'OriginalSupply');
  };

  // NEW: Export Single Invoice from Preview
  const handleSingleInvoicePDF = (invoice: any) => {
    if (!invoice) return;

    const rows = invoice.items.map((item: any) => [
      item.goodsName,
      item.quantity.toString()
    ]);

    generatePDF(
      `Supply Invoice: ${invoice.invoiceNumber}`,
      ['Goods Name', 'Quantity'],
      rows,
      `supply-invoice-${invoice.invoiceNumber}.pdf`
    );
  };

  const invoicePreview = previewInvoiceId
    ? filteredSupplyInvoices.find((i: any) => i.id === previewInvoiceId)
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
        <h1 className="text-2xl font-bold text-gray-900">Original Supply Bill</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportListPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download className="w-4 h-4" />
            PDF Report
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col gap-4">
          <label className="block text-sm font-medium text-gray-700">Date Range</label>
          
          <div className="flex gap-2 flex-wrap">
            {['today', '1week', '15days', '1month', '6months', 'custom'].map(opt => (
              <button
                key={opt}
                onClick={() => setDateRange(opt)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  dateRange === opt
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
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

        <table className="min-w-full divide-y divide-gray-200 mt-6">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredSupplyInvoices.length > 0 ? (
              filteredSupplyInvoices.map((item: any) => (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.items.reduce((sum: number, i: any) => sum + i.quantity, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setPreviewInvoiceId(item.id)}
                      className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                    >
                      View Bill
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
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
            Original Supply Bill Preview
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Date</span>
              <div className="text-sm text-gray-900 mt-1">{new Date(invoicePreview.date).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Invoice Number</span>
              <div className="text-sm text-gray-900 mt-1">{invoicePreview.invoiceNumber}</div>
            </div>
          </div>
          
          <div className="mb-6">
            <span className="text-xs text-gray-500 uppercase font-bold mb-2 block">Goods List</span>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Goods Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoicePreview.items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-800">{item.goodsName}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 text-right font-mono">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PREVIEW ACTIONS */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleSingleInvoicePDF(invoicePreview)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Bill PDF
            </button>
            <button
              onClick={() => setPreviewInvoiceId(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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