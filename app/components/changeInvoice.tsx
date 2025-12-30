'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Save, X, Home } from 'lucide-react';
import { formatDate } from './lib/date-utils';
import {
  getSupplyInvoices,
  updateSupplyInvoice,
  deleteSupplyInvoice,
  getReceiptInvoices,
  updateReceiptInvoice,
  deleteReceiptInvoice,
  addGoods,
  SupplyInvoice,
  ReceiptInvoice
} from './lib/storage';

const AVAILABLE_ATTRIBUTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface GoodsRow {
  id: string;
  goodsName: string;
  quantity: number;
}

interface ReceiptRow {
  id: string;
  goodsName: string;
  finishedQuantity: number;
  damagedQuantity: number;
  attributes: string[];
}

interface ChangeInvoiceProps {
  onNavigate: (page: string) => void;
}

export default function ChangeInvoice({ onNavigate }: ChangeInvoiceProps) {
  const [invoiceType, setInvoiceType] = useState<'supply' | 'receipt'>('supply');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [date, setDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [narration, setNarration] = useState('');
  const [reason, setReason] = useState('');

  const [supplyRows, setSupplyRows] = useState<GoodsRow[]>([]);
  
  const [receiptRows, setReceiptRows] = useState<ReceiptRow[]>([]);
  const [receiptInvoiceNumber, setReceiptInvoiceNumber] = useState('');
  const [supplyInvoiceNumber, setSupplyInvoiceNumber] = useState('');
  const [jobWorker, setJobWorker] = useState('');

  const [supplyInvoices, setSupplyInvoices] = useState<SupplyInvoice[]>([]);
  const [receiptInvoices, setReceiptInvoices] = useState<ReceiptInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const [supplies, receipts] = await Promise.all([
      getSupplyInvoices(),
      getReceiptInvoices()
    ]);
    setSupplyInvoices(supplies);
    setReceiptInvoices(receipts);
    setLoading(false);
  };

  const currentInvoices = invoiceType === 'supply' ? supplyInvoices : receiptInvoices;
  const selectedInvoice = currentInvoices.find(inv => inv.id === selectedInvoiceId);

  const handleInvoiceTypeChange = (type: 'supply' | 'receipt') => {
    setInvoiceType(type); 
    setSelectedInvoiceId(''); 
    setIsEditing(false); 
    resetForm();
  };

  const resetForm = () => {
    setDate(''); setInvoiceNumber(''); setNarration(''); setSupplyRows([]); setReceiptRows([]); setReason('');
    setReceiptInvoiceNumber(''); setSupplyInvoiceNumber(''); setJobWorker('');
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const invoice = currentInvoices.find(inv => inv.id === invoiceId);
    
    if (invoice) {
      setDate(invoice.date);
      setNarration(invoice.narration || '');
      
      if (invoiceType === 'supply') {
        const sup = invoice as SupplyInvoice;
        setInvoiceNumber(sup.invoiceNumber);
        setSupplyRows(sup.items.map((item, idx) => ({
          id: `${Date.now()}-${idx}`,
          goodsName: item.goodsName,
          quantity: item.quantity
        })));
      } else {
        const rec = invoice as ReceiptInvoice;
        setReceiptInvoiceNumber(rec.receiptInvoiceNumber);
        setSupplyInvoiceNumber(rec.supplyInvoiceNumber);
        setJobWorker(rec.jobWorker || '');
        setReceiptRows(rec.items.map((item, idx) => ({
          id: `${Date.now()}-${idx}`,
          goodsName: item.goodsName,
          finishedQuantity: item.finishedQuantity,
          damagedQuantity: item.damagedQuantity,
          attributes: item.attributes || []
        })));
      }
    }
    setIsEditing(false);
  };

  const handleEdit = () => { setIsEditing(true); setReason(''); };
  
  const handleCancelEdit = () => { 
    if (selectedInvoiceId) handleSelectInvoice(selectedInvoiceId); 
    setIsEditing(false); 
  };






const handleSave = async () => {
  if (!reason.trim()) { 
    alert('Please enter a reason for changing this invoice'); 
    return; 
  }
  
  setSaving(true);
  
  try {
    if (invoiceType === 'supply') {
      if (!invoiceNumber.trim()) { 
        alert('Please enter invoice number'); 
        setSaving(false); 
        return; 
      }
      
      const validRows = supplyRows.filter(row => row.goodsName.trim() && row.quantity > 0);
      
      if (validRows.length === 0) { 
        alert('Enter at least one item'); 
        setSaving(false); 
        return; 
      }
      
      for (const row of validRows) { 
        await addGoods(row.goodsName); 
      }
      
      await updateSupplyInvoice(selectedInvoiceId, {
        date, 
        invoiceNumber, 
        narration,
        items: validRows.map(row => ({ 
          goodsName: row.goodsName, 
          quantity: row.quantity 
        }))
      }, reason);
      
      alert('Supply invoice updated successfully!');
      
    } else {
      if (!receiptInvoiceNumber.trim()) { 
        alert('Please enter receipt invoice number'); 
        setSaving(false); 
        return; 
      }
      
      if (!supplyInvoiceNumber.trim()) { 
        alert('Please select a supply invoice'); 
        setSaving(false); 
        return; 
      }
      
      const validRows = receiptRows.filter(row =>
        row.goodsName.trim() && (row.finishedQuantity > 0 || row.damagedQuantity > 0)
      );
      
      if (validRows.length === 0) { 
        alert('Enter at least one item with quantities'); 
        setSaving(false); 
        return; 
      }

      const matchingSupply = supplyInvoices.find(inv => inv.invoiceNumber === supplyInvoiceNumber);
      
      if (!matchingSupply) {
        alert(`Supply invoice "${supplyInvoiceNumber}" not found. Please select a valid supply invoice.`);
        setSaving(false);
        return;
      }

      await updateReceiptInvoice(selectedInvoiceId, {
        date, 
        receiptInvoiceNumber, 
        supplyInvoiceNumber, 
        supplyInvoiceId: matchingSupply.id,
        jobWorker, 
        narration,
        items: validRows.map(row => ({
          goodsName: row.goodsName,
          finishedQuantity: row.finishedQuantity,
          damagedQuantity: row.damagedQuantity,
          attributes: row.attributes
        }))
      }, reason);
      
      alert('Receipt invoice updated successfully!');
    }
    
    await loadInvoices();
    setIsEditing(false); 
    setReason('');
    handleSelectInvoice(selectedInvoiceId);
    
  } catch (error) {
    console.error('Save error:', error);
    alert('Error updating invoice. Please try again.');
  } finally {
    setSaving(false);
  }
};








  const handleDelete = async () => {
    if (!selectedInvoiceId) return;
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        if (invoiceType === 'supply') await deleteSupplyInvoice(selectedInvoiceId);
        else await deleteReceiptInvoice(selectedInvoiceId);
        alert('Invoice deleted successfully!');
        await loadInvoices();
        setSelectedInvoiceId('');
        setIsEditing(false);
        resetForm();
      } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting invoice. Please try again.');
      }
    }
  };

  const addSupplyRow = () => setSupplyRows([...supplyRows, { id: Date.now().toString(), goodsName: '', quantity: 0 }]);
  const removeSupplyRow = (id: string) => { if (supplyRows.length > 1) setSupplyRows(supplyRows.filter(row => row.id !== id)); };
  const updateSupplyRow = (id: string, field: 'goodsName' | 'quantity', value: string | number) => {
    setSupplyRows(supplyRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addReceiptRow = () => setReceiptRows([...receiptRows, { id: Date.now().toString(), goodsName: '', finishedQuantity: 0, damagedQuantity: 0, attributes: [] }]);
  const removeReceiptRow = (id: string) => { if (receiptRows.length > 1) setReceiptRows(receiptRows.filter(row => row.id !== id)); };
  const updateReceiptRow = (id: string, field: keyof ReceiptRow, value: any) => {
    setReceiptRows(receiptRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const toggleAttribute = (rowId: string, attribute: string) => {
    const row = receiptRows.find(r => r.id === rowId);
    if (row) {
      let newAttributes;
      if (row.attributes.includes(attribute)) {
        newAttributes = row.attributes.filter(a => a !== attribute);
      } else {
        newAttributes = [...row.attributes, attribute];
      }
      updateReceiptRow(rowId, 'attributes', newAttributes);
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
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Home className="w-4 h-4" /> Home
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Change Invoice</h1>
        <div className="w-[100px]"></div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Invoice Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleInvoiceTypeChange('supply')}
            disabled={isEditing}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              invoiceType === 'supply' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Supply Invoice
          </button>
          <button
            onClick={() => handleInvoiceTypeChange('receipt')}
            disabled={isEditing}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              invoiceType === 'receipt' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Receipt Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select {invoiceType === 'supply' ? 'Supply' : 'Receipt'} Invoice to Edit
        </label>
        <select
          value={selectedInvoiceId}
          onChange={(e) => handleSelectInvoice(e.target.value)}
          disabled={isEditing}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        >
          <option value="">-- Select Invoice --</option>
          {currentInvoices.map((invoice: any) => (
            <option key={invoice.id} value={invoice.id}>
              {/* FIXED: Use formatDate for dropdown items */}
              {invoiceType === 'supply' ? invoice.invoiceNumber : invoice.receiptInvoiceNumber} - {formatDate(invoice.date)}
              ({invoice.items?.length || 0} items)
            </option>
          ))}
        </select>
      </div>

      {selectedInvoice && !isEditing && invoiceType === 'supply' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-gray-500">Date</span>
              {/* FIXED: Use formatDate for View Mode */}
              <div className="text-sm text-gray-800">{formatDate(selectedInvoice.date)}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Invoice Number</span>
              <div className="text-sm text-gray-800">{(selectedInvoice as SupplyInvoice).invoiceNumber}</div>
            </div>
          </div>
          {selectedInvoice.narration && (
            <div className="mb-4">
              <span className="text-xs text-gray-500">Narration</span>
              <div className="text-sm text-gray-800">{selectedInvoice.narration}</div>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-500">Items</span>
            <table className="w-full border mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Goods Name</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice as SupplyInvoice).items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-800">{item.goodsName}</td>
                    <td className="px-3 py-2 text-sm text-gray-800">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Edit className="w-4 h-4" /> Edit Invoice
            </button>
            <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Trash2 className="w-4 h-4" /> Delete Invoice
            </button>
          </div>
        </div>
      )}

      {selectedInvoice && !isEditing && invoiceType === 'receipt' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-gray-500">Date</span>
              {/* FIXED: Use formatDate for View Mode */}
              <div className="text-sm text-gray-800">{formatDate(selectedInvoice.date)}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Receipt Invoice Number</span>
              <div className="text-sm text-gray-800">{(selectedInvoice as ReceiptInvoice).receiptInvoiceNumber}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Supply Invoice Number</span>
              <div className="text-sm text-gray-800">{(selectedInvoice as ReceiptInvoice).supplyInvoiceNumber}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Job Worker</span>
              <div className="text-sm text-gray-800">{(selectedInvoice as ReceiptInvoice).jobWorker || 'N/A'}</div>
            </div>
          </div>
          {selectedInvoice.narration && (
            <div className="mb-4">
              <span className="text-xs text-gray-500">Narration</span>
              <div className="text-sm text-gray-800">{selectedInvoice.narration}</div>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-500">Items</span>
            <table className="w-full border mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Goods Name</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Finished</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Damaged</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Attributes</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice as ReceiptInvoice).items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-800">{item.goodsName}</td>
                    <td className="px-3 py-2 text-sm text-gray-800 text-right">{item.finishedQuantity}</td>
                    <td className="px-3 py-2 text-sm text-gray-800 text-right">{item.damagedQuantity}</td>
                    <td className="px-3 py-2 text-sm text-gray-800">{item.attributes?.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Edit className="w-4 h-4" /> Edit Invoice
            </button>
            <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Trash2 className="w-4 h-4" /> Delete Invoice
            </button>
          </div>
        </div>
      )}

      {isEditing && invoiceType === 'supply' && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
            <textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Change *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why you are changing this invoice..." rows={2} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <span className="block text-xs text-gray-500 mb-2">Goods</span>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Goods Name</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Quantity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {supplyRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input type="text" value={row.goodsName} onChange={(e) => updateSupplyRow(row.id, 'goodsName', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" value={row.quantity} onChange={(e) => updateSupplyRow(row.id, 'quantity', Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => removeSupplyRow(row.id)} disabled={supplyRows.length === 1} className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addSupplyRow} className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
          <div className="flex gap-4 mt-6">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={handleCancelEdit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      )}

      {isEditing && invoiceType === 'receipt' && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Invoice Number</label>
              <input type="text" value={receiptInvoiceNumber} onChange={(e) => setReceiptInvoiceNumber(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supply Invoice *
                  </label>
                  <select
                    value={supplyInvoiceNumber}
                    onChange={(e) => setSupplyInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">-- Select Supply Invoice --</option>
                    {supplyInvoices.map((inv) => (
                      <option key={inv.id} value={inv.invoiceNumber}>
                        {inv.invoiceNumber} - {formatDate(inv.date)}
                      </option>
                    ))}
                  </select>
                </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Worker</label>
              <input type="text" value={jobWorker} onChange={(e) => setJobWorker(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
            <textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Change *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why you are changing this invoice..." rows={2} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          
          <div>
            <span className="block text-xs text-gray-500 mb-2">Goods</span>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/4">Goods Name</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Finished</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Damaged</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Attributes</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {receiptRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 border-t border-gray-200">
                    <td className="px-3 py-2 align-top">
                      <input type="text" value={row.goodsName} onChange={(e) => updateReceiptRow(row.id, 'goodsName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Goods Name" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input type="number" min="0" value={row.finishedQuantity} onChange={(e) => updateReceiptRow(row.id, 'finishedQuantity', Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input type="number" min="0" value={row.damagedQuantity} onChange={(e) => updateReceiptRow(row.id, 'damagedQuantity', Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ATTRIBUTES.map(attr => {
                          const isSelected = row.attributes.includes(attr);
                          return (
                            <button
                              key={attr}
                              type="button"
                              onClick={() => toggleAttribute(row.id, attr)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                isSelected 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {attr}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center align-top">
                      <button type="button" onClick={() => removeReceiptRow(row.id)} disabled={receiptRows.length === 1} className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addReceiptRow} className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          <div className="flex gap-4 mt-6 pt-4 border-t border-gray-200">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm">
              <Save className="w-4 h-4" /> {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <button type="button" onClick={handleCancelEdit} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium shadow-sm">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}