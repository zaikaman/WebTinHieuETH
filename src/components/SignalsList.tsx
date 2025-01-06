'use client';

import { useEffect, useState } from 'react';

interface Signal {
  id: string;
  type: string;
  entry_price: number;
  exit_price: number;
  take_profit: number[];
  stop_loss: number;
  timestamp: string;
  status: string;
  risk_percent: number;
  current_price: number;
  profit: number | null;
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0.00';
  return Number(num).toFixed(2);
};

export default function SignalsList() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    active: 0,
    stopped: 0,
    winRate: 0
  });

  const fetchSignals = async () => {
    try {
      const response = await fetch(`/api/signals?status=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch signals');
      const data = await response.json();
      setSignals(data);
      
      // Calculate stats from all signals
      const activeCount = data.filter((s: Signal) => s.status === 'ACTIVE').length;
      const stoppedCount = data.filter((s: Signal) => s.status === 'STOPPED').length;
      const stoppedSignals = data.filter((s: Signal) => s.status === 'STOPPED');
      const winningTrades = stoppedSignals.filter((s: Signal) => s.profit !== null && s.profit > 0).length;
      const winRate = stoppedSignals.length > 0 ? (winningTrades / stoppedSignals.length * 100) : 0;
      
      setStats({
        active: activeCount,
        stopped: stoppedCount,
        winRate: winRate
      });
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [filter]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Trading Signals</h2>
          <div className="text-sm text-gray-400">
            Active: {stats.active} Stopped: {stats.stopped} Win Rate: {stats.winRate.toFixed(0)}%
          </div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Signals</option>
          <option value="active">Active Only</option>
          <option value="stopped">Stopped Only</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entry Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Exit Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Take Profit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stop Loss</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Profit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {signals.map((signal) => (
              <tr key={signal.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    signal.type === 'LONG' 
                      ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50' 
                      : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                  }`}>
                    {signal.type}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-white font-medium">${formatNumber(signal.entry_price)}</span>
                </td>
                <td className="px-4 py-4">
                  {signal.status === 'STOPPED' && signal.exit_price ? (
                    <span className={`font-medium ${
                      signal.type === 'LONG' 
                        ? Number(signal.exit_price) > Number(signal.entry_price) ? 'text-green-400' : 'text-red-400'
                        : Number(signal.exit_price) < Number(signal.entry_price) ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${formatNumber(signal.exit_price)}
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {signal.take_profit.map((tp, index) => (
                      <span key={index} className="text-green-400 font-medium">${formatNumber(tp)}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-red-400 font-medium">${formatNumber(signal.stop_loss)}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-yellow-400 font-medium">{formatNumber(signal.risk_percent)}%</span>
                </td>
                <td className="px-4 py-4">
                  {signal.status === 'STOPPED' && signal.profit !== null ? (
                    <span className={`font-medium ${signal.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${formatNumber(signal.profit)}
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-300">
                  {new Date(signal.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    signal.status === 'ACTIVE' 
                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                      : signal.status === 'COMPLETED'
                      ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                      : 'bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/50'
                  }`}>
                    {signal.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 