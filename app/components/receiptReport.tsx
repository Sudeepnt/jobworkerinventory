'use client';

import { useState, useEffect, useMemo } from 'react';
import { Home, Download, FileSpreadsheet, Eye, X } from 'lucide-react';
import { getReceiptInvoices, ReceiptInvoice } from './lib/storage';
import { generatePDF } from './lib/pdf-utils';
import { exportToExcel } from './lib/excel-utils';

interface ReceiptReportProps {
  onNavigate: (page: string) => void;
}

export default function ReceiptReport({ onNavigate }: ReceiptReportProps) {
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [receiptInvoices, setReceiptInvoices] = useState<ReceiptInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const receipts = await getReceiptInvoices();
      setReceiptInvoices(receipts);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredReceipts = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    switch (dateRange) {
      case 'today': startDate.setHours(0, 0, 0, 0); break;
      case '1week': startDate.setDate(now.getDate() - 7); break;
      case '15days': startDate.setDate(now.getDate() - 15); break;
      case '1month': startDate.setMonth(now.getMonth() - 1); break;
      case '6months': startDate.setMonth(now.getMonth() - 6); break;
      case 'custom': if (customStartDate) startDate = new Date(customStartDate); break;
    }
    const endDate = dateRange === 'custom' && customEndDate ? new Date(customEndDate) : now;
    return receiptInvoices.filter((inv) => {
      const receiptDate = new Date(inv.date);
      return receiptDate >= startDate && receiptDate <= endDate;
    });
  }, [receiptInvoices, dateRange, customStartDate, customEndDate]);

  const reportData = useMemo(() =>
    filteredReceipts.map(inv => {
      const finished = inv.items.reduce((sum, item) => sum + item.finishedQuantity, 0);
      const damaged = inv.items.reduce((sum, item) => sum + item.damagedQuantity, 0);
      const total = finished + damaged;
      return {
        ...inv,
        finished,
        damaged,
        total,
      };
    })
  , [filteredReceipts]);

  const selectedInvoice = reportData.find(inv => inv.id === selectedInvoiceId);

  const handleExportPDF = () => {
    const data = reportData.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.receiptInvoiceNumber,
      item.supplyInvoiceNumber,
      Math.round(item.finished).toString(),
      Math.round(item.damaged).toString(),
      Math.round(item.total).toString(),
    ]);
    generatePDF(
      'Receipt Report',
      ['Date', 'Receipt Invoice', 'Supply Invoice', 'Finished', 'Damaged', 'Total'],
      data,
      `receipt-report-${Date.now()}.pdf`
    );
  };

  const handleExportExcel = () => {
    const data = reportData.map(item => ({
      'Date': new Date(item.date).toLocaleDateString(),
      'Receipt Invoice': item.receiptInvoiceNumber,
      'Supply Invoice': item.supplyInvoiceNumber,
      'Finished': Math.round(item.finished),
      'Damaged': Math.round(item.damaged),
      'Total': Math.round(item.total),
    }));
    exportToExcel(data, `receipt-report-${Date.now()}.xlsx`, 'ReceiptReport');
  };

  const handleDownloadIndividualPDF = (invoice: typeof selectedInvoice) => {
    if (!invoice) return;
    const docTitle = "Receipt Invoice";
    const columns = ["Goods Name", "Finished Qty", "Damaged Qty", "Total Qty", "Attributes"];
    const tableData = invoice.items.map(item => [
      item.goodsName,
      Math.round(item.finishedQuantity).toString(),
      Math.round(item.damagedQuantity).toString(),
      Math.round(item.finishedQuantity + item.damagedQuantity).toString(),
      item.attributes.length > 0 ? item.attributes.join(", ") : "N/A"
    ]);
    generatePDF(
      docTitle,
      columns,
      tableData,
      `receipt-invoice.${invoice.receiptInvoiceNumber}-${Date.now()}.pdf`
    );
  };

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
          <Home className="w-4 h-4" /> Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Receipt Report</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Date Range
          </label>
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
                {opt === 'today'
                  ? 'Today'
                  : opt === '1week'
                  ? '1 Week'
                  : opt === '15days'
                  ? '15 Days'
                  : opt === '1month'
                  ? '1 Month'
                  : opt === '6months'
                  ? '6 Month'
                  : 'Custom'}
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
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receipt Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supply Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Finished
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Damaged
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {reportData.length > 0 ? (
              reportData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.receiptInvoiceNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.supplyInvoiceNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(item.finished)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(item.damaged)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(item.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview"
                        onClick={() => setSelectedInvoiceId(item.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Download PDF"
                        onClick={() => handleDownloadIndividualPDF(item)}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No receipt invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Receipt Invoice Preview</h2>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setSelectedInvoiceId(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-xs text-gray-500">Receipt Invoice Number</span>
                  <div className="text-sm font-semibold text-gray-900">{selectedInvoice.receiptInvoiceNumber}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Supply Invoice Number</span>
                  <div className="text-sm font-semibold text-gray-900">{selectedInvoice.supplyInvoiceNumber}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Date</span>
                  <div className="text-sm text-gray-800">{new Date(selectedInvoice.date).toLocaleDateString()}</div>
                </div>
                {selectedInvoice.jobWorker && (
                  <div>
                    <span className="text-xs text-gray-500">Job Worker</span>
                    <div className="text-sm text-gray-800">{selectedInvoice.jobWorker}</div>
                  </div>
                )}
              </div>
              {selectedInvoice.narration && (
                <div className="mb-6">
                  <span className="text-xs text-gray-500">Narration</span>
                  <div className="text-sm text-gray-800">{selectedInvoice.narration}</div>
                </div>
              )}
              <div className="mb-6">
                <span className="text-xs text-gray-500 mb-2 block">Items</span>
                <table className="w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Goods Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Finished</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Damaged</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Attributes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="px-4 py-2 text-sm text-gray-800">{item.goodsName}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{Math.round(item.finishedQuantity)}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">{Math.round(item.damagedQuantity)}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {Math.round(item.finishedQuantity + item.damagedQuantity)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {item.attributes.length > 0 ? item.attributes.join(', ') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Finished</span>
                      <span className="text-sm font-semibold text-gray-900">{Math.round(selectedInvoice.finished)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Damaged</span>
                      <span className="text-sm font-semibold text-gray-900">{Math.round(selectedInvoice.damaged)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-base font-bold text-gray-900">Grand Total</span>
                      <span className="text-base font-bold text-blue-600">{Math.round(selectedInvoice.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDownloadIndividualPDF(selectedInvoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => setSelectedInvoiceId(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 text-xs text-gray-400 text-right">
                  Generated on {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}