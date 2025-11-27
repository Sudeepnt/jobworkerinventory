'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Home } from 'lucide-react';
import { addReceiptInvoice, getSupplyInvoices, SupplyInvoice } from './lib/storage';

interface GoodsRow {
  id: string;
  goodsName: string;
  finishedQuantity: number;
  damagedQuantity: number;
  attributes: string[];
}

interface ReceiptFormProps {
  onNavigate: (page: string) => void;
}

const PREDEFINED_ATTRIBUTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function ReceiptForm({ onNavigate }: ReceiptFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptInvoiceNumber, setReceiptInvoiceNumber] = useState('');
  const [selectedSupplyId, setSelectedSupplyId] = useState('');
  const [jobWorker, setJobWorker] = useState('');
  const [narration, setNarration] = useState('');
  const [rows, setRows] = useState<GoodsRow[]>([
    { id: Date.now().toString(), goodsName: '', finishedQuantity: 0, damagedQuantity: 0, attributes: [] }
  ]);
  const [supplyInvoices, setSupplyInvoices] = useState<SupplyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const invoices = await getSupplyInvoices();
      setSupplyInvoices(invoices);
      setLoading(false);
    }
    loadData();
  }, []);

  const selectedSupply = supplyInvoices.find((inv: any) => inv.id === selectedSupplyId);

  useEffect(() => {
    if (selectedSupply) {
      setRows(
        (selectedSupply.items || []).map((item: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          goodsName: item.goodsName,
          finishedQuantity: 0,
          damagedQuantity: 0,
          attributes: [],
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplyId]);

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now().toString(), goodsName: '', finishedQuantity: 0, damagedQuantity: 0, attributes: [] }
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof GoodsRow, value: any) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const toggleAttribute = (rowId: string, attribute: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row) {
      if (row.attributes.includes(attribute)) {
        updateRow(rowId, 'attributes', row.attributes.filter(a => a !== attribute));
      } else {
        updateRow(rowId, 'attributes', [...row.attributes, attribute]);
      }
    }
  };

  const handleSave = async () => {
    if (!receiptInvoiceNumber.trim()) {
      alert('Please enter receipt invoice number');
      return;
    }

    if (!selectedSupplyId) {
      alert('Please select a supply invoice');
      return;
    }

    const validRows = rows.filter(
      row => row.goodsName.trim() && (row.finishedQuantity > 0 || row.damagedQuantity > 0)
    );

    if (validRows.length === 0) {
      alert('Please add at least one item with quantities');
      return;
    }

    setSaving(true);
    try {
      await addReceiptInvoice({
        date,
        receiptInvoiceNumber,
        supplyInvoiceId: selectedSupplyId,
        supplyInvoiceNumber: selectedSupply?.invoiceNumber || '',
        jobWorker,
        narration,
        items: validRows,
      });
      alert('Receipt invoice saved successfully!');
      onNavigate('dashboard');
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving receipt invoice. Please try again.');
    } finally {
      setSaving(false);
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
      <div className="flex gap-3 items-center mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" /> Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900 ml-3">New Receipt Invoice</h1>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
        className="bg-white rounded-lg shadow-md p-6 mb-6"
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Invoice Number</label>
            <input
              type="text"
              value={receiptInvoiceNumber}
              onChange={e => setReceiptInvoiceNumber(e.target.value)}
              placeholder="REC-001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Matching Supply Invoice</label>
            <select
              value={selectedSupplyId}
              onChange={e => setSelectedSupplyId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Select Supply Invoice --</option>
              {supplyInvoices.map(invoice => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {new Date(invoice.date).toLocaleDateString()} ({invoice.items.length} items)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Worker (Optional)</label>
            <input
              type="text"
              value={jobWorker}
              onChange={e => setJobWorker(e.target.value)}
              placeholder="Enter job worker name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
          <textarea
            value={narration}
            onChange={e => setNarration(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <span className="block text-xs text-gray-500 mb-2">Goods</span>
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-xs font-medium text-gray-500">Goods Name</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500">Finished Qty</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500">Damaged Qty</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 min-w-[350px]">Attributes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.goodsName}
                      onChange={e => updateRow(row.id, 'goodsName', e.target.value)}
                      placeholder="Goods name..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.finishedQuantity}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        updateRow(row.id, 'finishedQuantity', Math.max(0, val));
                      }}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.damagedQuantity}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        updateRow(row.id, 'damagedQuantity', Math.max(0, val));
                      }}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 flex-wrap">
                      {PREDEFINED_ATTRIBUTES.map(attr => {
                        const isSelected = row.attributes.includes(attr);
                        return (
                          <button
                            key={attr}
                            type="button"
                            onClick={() => toggleAttribute(row.id, attr)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {attr}
                          </button>
                        );
                      })}
                    </div>
                    {row.attributes.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        Selected: {row.attributes.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" /> Add Row
        </button>
        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
