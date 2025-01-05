'use client';

import { useEffect, useState } from 'react';

interface Signal {
  id: string;
  type: string;
  entry_price: number;
  take_profit: number[];
  stop_loss: number;
  timestamp: string;
  status: string;
  risk_percent: number;
  current_price: number;
}

export default function SignalsList() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    winRate: 0
  });

  // Function to fetch signals based on selected status
  const fetchSignals = async () => {
    try {
      const response = await fetch(`/api/signals?status=${selectedStatus}`);
      if (!response.ok) throw new Error('Failed to fetch signals');
      const fetchedSignals = await response.json();
      setSignals(fetchedSignals);

      // Update stats
      const activeCount = fetchedSignals.filter((s: Signal) => s.status === 'ACTIVE').length;
      const completedSignals = fetchedSignals.filter((s: Signal) => s.status === 'COMPLETED');
      const completedCount = completedSignals.length;
      const winRate = completedCount > 0 
        ? (completedSignals.filter((s: Signal) => {
            const currentPrice = s.current_price;
            return (s.type === 'LONG' && currentPrice > s.entry_price) || 
                   (s.type === 'SHORT' && currentPrice < s.entry_price);
          }).length / completedCount * 100)
        : 0;

      setStats({
        active: activeCount,
        completed: completedCount,
        winRate: Math.round(winRate)
      });
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  // Initial fetch and setup polling
  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [selectedStatus]);

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Trading Signals</h2>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-400">Active: {stats.active}</span>
            <span className="text-gray-400">Completed: {stats.completed}</span>
            <span className="text-gray-400">Win Rate: {stats.winRate}%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <select 
            className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 border-0 focus:ring-2 focus:ring-green-500"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Signals</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entry Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Take Profit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stop Loss</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Risk</th>
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
                  <span className="text-white font-medium">${signal.entry_price}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {signal.take_profit.map((tp, index) => (
                      <span key={index} className="text-green-400 font-medium">${tp}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-red-400 font-medium">${signal.stop_loss}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-yellow-400 font-medium">{signal.risk_percent}%</span>
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