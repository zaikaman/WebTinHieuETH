'use client';

import { useRef } from 'react';

export default function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">ETHUSDT Perpetual</h2>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-400">Vol: 2.1B</span>
            <span className="text-gray-400">24h High: $2,280.50</span>
            <span className="text-gray-400">24h Low: $2,180.20</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
            Indicators
          </button>
          <select className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 border-0 focus:ring-2 focus:ring-green-500">
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1D</option>
          </select>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[600px] bg-gray-900/50 rounded-lg border border-gray-700">
        {/* TradingView Chart sẽ được thêm vào đây */}
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-green-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Đang tải biểu đồ...</p>
          </div>
        </div>
      </div>
    </div>
  );
} 