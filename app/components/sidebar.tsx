'use client';

import React from 'react';
import { Home, FileText, Package, BarChart3, FileStack, Settings, Database, History, Heart } from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'supply', label: 'Supply Invoice', icon: FileText },
    { id: 'receipt', label: 'Receipt Invoice', icon: Package },
    { id: 'goods-report', label: 'Goods Report', icon: BarChart3 },
    { id: 'original-supply', label: 'Original Supply Report', icon: FileStack },
    { id: 'dynamic-supply', label: 'Dynamic Supply Report', icon: FileStack },
    { id: 'attribute-report', label: 'Attribute Report', icon: BarChart3 },
    { id: 'receipt-report', label: 'Receipt Report', icon: FileStack },
    { id: 'change-invoice', label: 'Change Invoice', icon: Settings },
    { id: 'invoice-history', label: 'Invoice Change History', icon: History },
    { id: 'backup-restore', label: 'Backup & Restore', icon: Database },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">LKO JobWork</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {React.createElement(item.icon, { className: 'w-5 h-5' })}
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {/* Changed gap-1 to gap-0.5 to bring them very close */}
        <div className="flex items-center justify-center gap-0.5 text-sm text-gray-600">
          <span>Built by</span>
          <a 
            href="https://crodal.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity flex items-center"
          >
            <Image 
              src="/crodalLogo.png" 
              alt="Crodal" 
              width={120}
              height={36}
              className="object-contain"
            />
          </a>
        </div>
      </div>
    </aside>
  );
}