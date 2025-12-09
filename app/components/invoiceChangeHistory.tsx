'use client';

import { useEffect, useState, useMemo } from 'react';
import { Home, X } from 'lucide-react';
import { getInvoiceChanges, InvoiceChange } from './lib/storage';
import { supabase } from './lib/supabase';
import { formatDate, formatDateTime } from './lib/date-utils';

interface InvoiceChangeHistoryProps {
  onNavigate: (page: string) => void;
}

// --- PREVIEW MODAL (Shows Actual Form Data) ---
function InvoicePreviewModal({ 
  data, 
  type, 
  onClose 
}: { 
  data: any; 
  type: 'supply' | 'receipt'; 
  onClose: () => void 
}) {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            {type === 'supply' ? 'Supply Invoice Preview' : 'Receipt Invoice Preview'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Top Details */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Date</label>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(data.date)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">
                {type === 'supply' ? 'Invoice Number' : 'Receipt Number'}
              </label>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {type === 'supply' ? data.invoice_number : data.receipt_invoice_number}
              </div>
            </div>
            {type === 'receipt' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Supply Ref</label>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {data.supply_invoice_number}
                </div>
              </div>
            )}
            {data.job_worker && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Job Worker</label>
                <div className="mt-1 text-sm font-medium text-gray-900">{data.job_worker}</div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Goods Name</th>
                  {type === 'supply' ? (
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Quantity</th>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Finished</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Damaged</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {type === 'supply' 
                  ? data.supply_invoice_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.goods_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                      </tr>
                    ))
                  : data.receipt_invoice_items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.goods_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.finished_quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.damaged_quantity}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function InvoiceChangeHistory({ onNavigate }: InvoiceChangeHistoryProps) {
  const [changes, setChanges] = useState<InvoiceChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'supply' | 'receipt'>('supply');
  
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await getInvoiceChanges();
      setChanges(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredChanges = useMemo(() => {
    return changes.filter(change => {
      const txt = (change.changeDetails + change.reason).toLowerCase();
      const isReceipt = txt.includes('receipt') || txt.includes('finished') || txt.includes('damaged');
      return activeTab === 'receipt' ? isReceipt : !isReceipt;
    });
  }, [changes, activeTab]);

  const handlePreviewClick = async (invoiceId: string) => {
    if (!invoiceId) return;
    setLoadingPreview(true);
    
    const table = activeTab === 'supply' ? 'supply_invoices' : 'receipt_invoices';
    const relation = activeTab === 'supply' ? 'supply_invoice_items' : 'receipt_invoice_items';

    try {
      const { data, error } = await supabase
        .from(table)
        .select(`*, ${relation}(*)`)
        .eq('id', invoiceId)
        .single();
        
      if (!error && data) {
        setPreviewData(data);
      } else {
        alert('Invoice data not found (it might have been deleted).');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
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
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" /> Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900 ml-3">Invoice Change History</h1>
      </div>

      <div className="bg-white p-2 rounded-lg border border-gray-200 inline-flex mb-6 shadow-sm">
        <button
          onClick={() => setActiveTab('supply')}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
            activeTab === 'supply' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Supply Invoice
        </button>
        <button
          onClick={() => setActiveTab('receipt')}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
            activeTab === 'receipt' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Receipt Invoice
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden min-h-[400px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-48">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-48">Invoice No</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reason</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredChanges.length > 0 ? (
              filteredChanges.map((change) => (
                <tr key={change.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(change.changeDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handlePreviewClick(change.invoiceId)}
                      disabled={loadingPreview}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 transition-colors"
                    >
                      {change.invoiceNumber || 'View'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {change.reason}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                  No {activeTab} changes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {previewData && (
        <InvoicePreviewModal 
          data={previewData} 
          type={activeTab} 
          onClose={() => setPreviewData(null)} 
        />
      )}
    </div>
  );
}