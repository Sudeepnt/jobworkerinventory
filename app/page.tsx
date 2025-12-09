'use client';

import { useState, useEffect } from 'react';


import LoginPage from "./components/login";
import Sidebar from "./components/sidebar";
import Dashboard from "./components/dashboard";
import SupplyForm from "./components/SupplyForm";
import ReceiptForm from "./components/receiptForm";
import GoodsReport from "./components/goodsReport";
import OriginalSupplyReport from "./components/originalSupplyReport";
import DynamicSupplyReport from "./components/dynamicSupplyReport";
import AttributeReport from "./components/attributeReport";
import ReceiptReport from "./components/receiptReport";
import ChangeInvoice from "./components/changeInvoice";
import InvoiceChangeHistory from "./components/invoiceChangeHistory";
import BackupRestore from "./components/backupRestore";

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
    setLoading(false);
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  if (loading) {
    return null;
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'supply':
        return <SupplyForm onNavigate={setCurrentPage} />;
      case 'receipt':
        return <ReceiptForm onNavigate={setCurrentPage} />;
      case 'goods-report':
        return <GoodsReport onNavigate={setCurrentPage} />;
      case 'original-supply':
        return <OriginalSupplyReport onNavigate={setCurrentPage} />;
      case 'dynamic-supply':
        return <DynamicSupplyReport onNavigate={setCurrentPage} />;
      case 'attribute-report':
        return <AttributeReport onNavigate={setCurrentPage} />;
      case 'receipt-report':
        return <ReceiptReport onNavigate={setCurrentPage} />;
      case 'change-invoice':
        return <ChangeInvoice onNavigate={setCurrentPage} />;
      case 'invoice-history':
        return <InvoiceChangeHistory onNavigate={setCurrentPage} />;
      case 'backup-restore':
        return <BackupRestore onNavigate={setCurrentPage} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}