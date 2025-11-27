'use client';

import { useState, useEffect, useMemo } from 'react';
import { Home, Download, FileSpreadsheet, Search, X } from 'lucide-react';
import { getReceiptInvoices } from './lib/storage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AttributeReportProps {
  onNavigate: (page: string) => void;
}

const PREDEFINED_ATTRIBUTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function AttributeReport({ onNavigate }: AttributeReportProps) {
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [receiptInvoices, setReceiptInvoices] = useState<any[]>([]);

  // Modal state
  const [selectedDetail, setSelectedDetail] = useState<{
    receiptInvoiceNumber: string;
    attribute: string;
    date: string;
    supplyInvoiceNumber: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const receipts = await getReceiptInvoices();
      setReceiptInvoices(receipts);
      setLoading(false);
    }
    load();
  }, []);

  const filteredData = useMemo(() => {
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

    return receiptInvoices.filter((receipt: any) => {
      const receiptDate = new Date(receipt.date);
      return receiptDate >= startDate && receiptDate <= endDate;
    });
  }, [receiptInvoices, dateRange, customStartDate, customEndDate]);

  const reportData = useMemo(() => {
    const dataMap = new Map<string, any>();
    filteredData.forEach((receipt: any) => {
      receipt.items.forEach((item: any) => {
        const key = `${receipt.date}-${receipt.receiptInvoiceNumber}`;
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            date: receipt.date,
            receiptInvoiceNumber: receipt.receiptInvoiceNumber,
            supplyInvoiceNumber: receipt.supplyInvoiceNumber,
            A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0,
            details: {
              A: [], B: [], C: [], D: [], E: [], F: [], G: [], H: []
            }
          });
        }
        const entry = dataMap.get(key);
        item.attributes.forEach((attr: string) => {
          if (PREDEFINED_ATTRIBUTES.includes(attr)) {
            entry[attr] += item.finishedQuantity;
            entry.details[attr].push({
              goodsName: item.goodsName,
              finishedQuantity: item.finishedQuantity,
              damagedQuantity: item.damagedQuantity
            });
          }
        });
      });
    });
    return Array.from(dataMap.values()).sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredData]);

  const searchedData = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const query = searchQuery.toLowerCase();
    return reportData.filter((item: any) =>
      item.receiptInvoiceNumber.toLowerCase().includes(query) ||
      item.supplyInvoiceNumber.toLowerCase().includes(query) ||
      new Date(item.date).toLocaleDateString().toLowerCase().includes(query)
    );
  }, [reportData, searchQuery]);

  const handleAttributeClick = (item: any, attribute: string) => {
    if (item[attribute] > 0) {
      setSelectedDetail({
        receiptInvoiceNumber: item.receiptInvoiceNumber,
        attribute,
        date: item.date,
        supplyInvoiceNumber: item.supplyInvoiceNumber
      });
    }
  };

  const getDetailedData = () => {
    if (!selectedDetail) return [];
    const item = reportData.find(
      (d: any) => d.receiptInvoiceNumber === selectedDetail.receiptInvoiceNumber
    );
    return item?.details[selectedDetail.attribute] || [];
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Attribute Report', 14, 20);

    const tableData = searchedData.map((item: any) => [
      new Date(item.date).toLocaleDateString(),
      item.receiptInvoiceNumber,
      item.supplyInvoiceNumber,
      item.A || 0,
      item.B || 0,
      item.C || 0,
      item.D || 0,
      item.E || 0,
      item.F || 0,
      item.G || 0,
      item.H || 0
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Receipt Invoice', 'Supply Invoice', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`attribute-report-${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    const data = searchedData.map((item: any) => ({
      'Date': new Date(item.date).toLocaleDateString(),
      'Receipt Invoice': item.receiptInvoiceNumber,
      'Supply Invoice': item.supplyInvoiceNumber,
      'A': item.A || 0,
      'B': item.B || 0,
      'C': item.C || 0,
      'D': item.D || 0,
      'E': item.E || 0,
      'F': item.F || 0,
      'G': item.G || 0,
      'H': item.H || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AttributeReport');
    XLSX.writeFile(wb, `attribute-report-${Date.now()}.xlsx`);
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Attribute Report</h1>
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

      {/* Date Range Button Group */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col gap-4">
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

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Receipt or Supply Invoice"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchQuery && (
            <div className="text-sm text-gray-600">
              Found {searchedData.length} result{searchedData.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supply Invoice</th>
                {PREDEFINED_ATTRIBUTES.map((attr: string) => (
                  <th key={attr} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {attr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {searchedData.length > 0 ? (
                searchedData.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.receiptInvoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.supplyInvoiceNumber}</td>
                    {PREDEFINED_ATTRIBUTES.map((attr: string) => (
                      <td key={attr} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {item[attr] > 0 ? (
                          <button
                            onClick={() => handleAttributeClick(item, attr)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {item[attr]}
                          </button>
                        ) : (
                          <span className="text-gray-900">0</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchQuery ? 'No matching invoices found' : 'No data found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Attribute {selectedDetail.attribute} Details</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Receipt: {selectedDetail.receiptInvoiceNumber} | Supply: {selectedDetail.supplyInvoiceNumber}
                </p>
                <p className="text-sm text-gray-600">
                  Date: {new Date(selectedDetail.date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <table className="w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Goods Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Finished Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Damaged Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {getDetailedData().map((detail: any, idx: number) => (
                    <tr key={idx} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm text-gray-800">{detail.goodsName}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">{detail.finishedQuantity}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-800">{detail.damagedQuantity}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                        {detail.finishedQuantity + detail.damagedQuantity}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className="px-4 py-2 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {getDetailedData().reduce((sum: number, d: any) => sum + d.finishedQuantity, 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">
                      {getDetailedData().reduce((sum: number, d: any) => sum + d.damagedQuantity, 0)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-blue-600">
                      {getDetailedData().reduce((sum: number, d: any) => sum + d.finishedQuantity + d.damagedQuantity, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
