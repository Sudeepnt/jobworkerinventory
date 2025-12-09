'use client';

import { useState, useEffect, useMemo } from 'react';
import { Home, Download, FileSpreadsheet, Search, X } from 'lucide-react';
import { getReceiptInvoices } from './lib/storage';
import { generatePDF } from './lib/pdf-utils';
import { formatDate } from './lib/date-utils';
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
      formatDate(item.date).toLowerCase().includes(query)
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
      formatDate(item.date),
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
      'Date': formatDate(item.date),
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

  // --- UPDATED: PDF Download for Preview Modal ---
  const handleDetailPDF = () => {
    if (!selectedDetail) return;
    const details = getDetailedData();
    
    // Format: Date | Receipt Inv No | Supply Inv No | Goods Name | Total
    const rows = details.map((d: any) => [
      formatDate(selectedDetail.date),
      selectedDetail.receiptInvoiceNumber,
      selectedDetail.supplyInvoiceNumber,
      d.goodsName,
      (d.finishedQuantity + d.damagedQuantity).toString() // Total
    ]);

    // Calculate Grand Total
    const totalAll = details.reduce((sum: number, d: any) => sum + d.finishedQuantity + d.damagedQuantity, 0);

    // Add Total Row
    rows.push(['', '', '', 'TOTAL', totalAll.toString()]);

    generatePDF(
      `Attribute ${selectedDetail.attribute} Details`,
      ['Date', 'Receipt Inv No', 'Supply Inv No', 'Goods Name', 'Total'],
      rows,
      `Attr_${selectedDetail.attribute}_${selectedDetail.receiptInvoiceNumber}.pdf`
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

      {/* Main Table */}
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
                      {formatDate(item.date)}
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

      {/* --- PREVIEW MODAL (UPDATED WITH NEW COLUMNS) --- */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                Attribute {selectedDetail.attribute} Details
              </h2>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Table Content */}
            <div className="p-8 bg-white min-h-[300px]">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-500 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase">Receipt Inv No</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase">Supply Inv No</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase">Goods Name</th>
                      <th className="px-6 py-3 text-right text-xs font-bold uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getDetailedData().map((detail: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(selectedDetail.date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{selectedDetail.receiptInvoiceNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{selectedDetail.supplyInvoiceNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{detail.goodsName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold">
                          {detail.finishedQuantity + detail.damagedQuantity}
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-gray-50 border-t-2 border-gray-300">
                      <td colSpan={3}></td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">TOTAL</td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">
                        {getDetailedData().reduce((sum: number, d: any) => sum + d.finishedQuantity + d.damagedQuantity, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-100 px-8 py-5 flex justify-end gap-3">
              <button
                onClick={handleDetailPDF}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}