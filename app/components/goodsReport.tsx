'use client';

import { useState, useMemo, useEffect } from 'react';
import { Home, Download, FileSpreadsheet, Eye, Search } from 'lucide-react';
import { getGoods, getSupplyInvoices, getReceiptInvoices } from './lib/storage';
import { generatePDF } from './lib/pdf-utils';
import { exportToExcel } from './lib/excel-utils';

interface GoodsReportProps {
  onNavigate: (page: string) => void;
}

// --- BILL STYLE MODAL ---
function GoodHistoryModal({ data, onClose }: { data: any, onClose: () => void }) {
  if (!data) return null;

  // Show ONLY Receipts to match the requested columns (Rec Qty, Finished, Damaged)
  // This removes the "empty" supply rows that had no data for these columns
  const rows = [
    ...data.transactions.receipts.map((r: any) => ({
      date: r.date,
      name: data.name,
      recQty: r.finished + r.damaged,
      finished: r.finished,
      damaged: r.damaged
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleDownloadPDF = () => {
    const tableData = rows.map(r => [
      new Date(r.date).toLocaleDateString(),
      r.name,
      r.recQty.toString(),
      r.finished.toString(),
      r.damaged.toString()
    ]);
    generatePDF(`Report_${data.name}`, ['Date', 'Goods Name', 'Rec Qty', 'Finished', 'Damaged'], tableData, `report_${data.name}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      {/* Paper/Bill Container */}
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
          <div>
            <h3 className="font-bold text-xl text-gray-900">{data.name} History</h3>
            <p className="text-sm text-gray-500 mt-1">Transaction Statement (Receipts Only)</p>
          </div>
          <button 
            onClick={handleDownloadPDF} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* Scrollable Bill Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-white min-h-[400px]">
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Goods Name</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Rec Qty</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Finished</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Damaged</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length > 0 ? (
                  rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {new Date(row.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono font-medium">
                        {row.recQty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono text-green-700">
                        {row.finished}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono text-red-600">
                        {row.damaged}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                      No receipt transactions recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Visual "Gap" at bottom - Larger to look like a bill/paper end */}
          <div className="h-24 w-full border-t-2 border-dashed border-gray-100 mt-4"></div>
        </div>

        {/* Footer with Close Button Right Aligned */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex justify-end rounded-b-lg">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---

export default function GoodsReport({ onNavigate }: GoodsReportProps) {
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [goods, setGoods] = useState<any[]>([]);
  const [supplyInvoices, setSupplyInvoices] = useState<any[]>([]);
  const [receiptInvoices, setReceiptInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGood, setSelectedGood] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [goodsData, supplies, receipts] = await Promise.all([
        getGoods(),
        getSupplyInvoices(),
        getReceiptInvoices()
      ]);
      setGoods(goodsData);
      setSupplyInvoices(supplies);
      setReceiptInvoices(receipts);
      setLoading(false);
    }
    loadData();
  }, []);

  // Filter Data based on Date Range
  const filteredSupplies = useMemo(() => {
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
    return supplyInvoices.filter((inv: any) => {
      const d = new Date(inv.date);
      return d >= startDate && d <= endDate;
    });
  }, [supplyInvoices, dateRange, customStartDate, customEndDate]);

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
    return receiptInvoices.filter((inv: any) => {
      const d = new Date(inv.date);
      return d >= startDate && d <= endDate;
    });
  }, [receiptInvoices, dateRange, customStartDate, customEndDate]);

  // Aggregate Data
  const baseReportData = useMemo(() => {
    return goods.map((good: any) => {
      let suppliedQty = 0;
      const supplyTrans: any[] = [];
      
      filteredSupplies.forEach((inv: any) => {
        inv.items.forEach((item: any) => {
          if (item.goodsName === good.name) {
            const qty = Number(item.quantity) || 0;
            suppliedQty += qty;
            supplyTrans.push({
              date: inv.date,
              invoiceNumber: inv.invoiceNumber,
              quantity: qty
            });
          }
        });
      });

      let finishedQty = 0;
      let damagedQty = 0;
      const receiptTrans: any[] = [];

      filteredReceipts.forEach((inv: any) => {
        inv.items.forEach((item: any) => {
          if (item.goodsName === good.name) {
            const fin = Number(item.finishedQuantity) || 0;
            const dmg = Number(item.damagedQuantity) || 0;
            finishedQty += fin;
            damagedQty += dmg;
            receiptTrans.push({
              date: inv.date,
              receiptNumber: inv.receiptInvoiceNumber,
              finished: fin,
              damaged: dmg
            });
          }
        });
      });

      const receivedQty = finishedQty + damagedQty;
      const stockWithJobWorker = suppliedQty - receivedQty;
      
      return {
        name: good.name,
        stockWithJobWorker,
        receivedQty,
        finishedQty,
        damagedQty,
        transactions: {
          supplies: supplyTrans,
          receipts: receiptTrans
        }
      };
    });
  }, [goods, filteredSupplies, filteredReceipts]);

  // Search Filter
  const finalDisplayData = useMemo(() => {
    if (!searchQuery.trim()) return baseReportData;
    return baseReportData.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [baseReportData, searchQuery]);

  // Global Exports
  const handleExportPDF = () => {
    const data = finalDisplayData.map((item: any) => [
      item.name,
      Math.round(item.stockWithJobWorker).toString(),
      Math.round(item.receivedQty).toString(),
      Math.round(item.finishedQty).toString(),
      Math.round(item.damagedQty).toString(),
    ]);
    generatePDF(
      `Goods Report (${dateRange})`,
      ['Goods Name', 'Stock Pending', 'Total Recv', 'Finished', 'Damaged'],
      data,
      `goods-report-${Date.now()}.pdf`
    );
  };

  const handleExportExcel = () => {
    const data = finalDisplayData.map((item: any) => ({
      'Goods Name': item.name,
      'Stock with Job Worker': Math.round(item.stockWithJobWorker),
      'Received Qty': Math.round(item.receivedQty),
      'Finished Qty': Math.round(item.finishedQty),
      'Damaged Qty': Math.round(item.damagedQty)
    }));
    exportToExcel(data, `goods-report-${Date.now()}.xlsx`, 'GoodsReport');
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
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" /> Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Goods Report</h1>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-6 justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range Filter
              </label>
              <div className="flex gap-2 flex-wrap">
                {['today', '1week', '15days', '1month', '6months', 'custom'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDateRange(opt)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${dateRange === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                  >
                    {opt === 'today' ? 'Today' :
                      opt === '1week' ? '1 Week' :
                        opt === '15days' ? '15 Days' :
                          opt === '1month' ? '1 Month' :
                            opt === '6months' ? '6 Month'
                              : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Goods
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter goods name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 block w-full border border-gray-300 rounded-lg py-2 px-4 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-4 mt-2 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto min-h-[400px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Goods Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Stock (Job Worker)
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Recv Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Finished
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Damaged
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Preview
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {finalDisplayData.length > 0 ? (
              finalDisplayData.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-orange-600">{Math.round(item.stockWithJobWorker)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{Math.round(item.receivedQty)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-700">{Math.round(item.finishedQty)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-red-600">{Math.round(item.damagedQty)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => setSelectedGood(item)}
                      className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                      title="View Transactions"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  No data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Simple Table Modal */}
      {selectedGood && (
        <GoodHistoryModal 
          data={selectedGood} 
          onClose={() => setSelectedGood(null)} 
        />
      )}
    </div>
  );
}