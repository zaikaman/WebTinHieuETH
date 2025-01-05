'use client';

import { useEffect, useState } from 'react';

interface BalanceStats {
  total_balance: number;
  available_balance: number;
  total_pnl_usd: number;
  total_pnl_percentage: number;
  daily_pnl_usd: number;
  daily_pnl_percentage: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  average_win_usd: number;
  average_loss_usd: number;
  risk_reward_ratio: number;
  max_drawdown: number;
  current_drawdown: number;
  peak_balance: number;
  total_fees_paid: number;
  total_funding_paid: number;
}

export default function StatsPanel() {
  const [stats, setStats] = useState<BalanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateAndFetchStats = async () => {
    try {
      // First update the balance calculations
      await fetch('/api/balance/update', { method: 'POST' });
      
      // Then fetch the latest stats
      const response = await fetch('/api/balance');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateAndFetchStats();
    const interval = setInterval(updateAndFetchStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatPercentage = (value: number) => {
    return `${formatNumber(value, 2)}%`;
  };

  const formatUSD = (value: number) => {
    return `$${formatNumber(value, 2)}`;
  };

  if (isLoading || !stats) {
    return (
      <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Trading Statistics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Section */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">Total Balance</h3>
          <p className="text-white text-2xl font-bold">{formatUSD(stats.total_balance)}</p>
          <p className="text-sm">
            <span className="text-gray-400">Available: </span>
            <span className="text-white">{formatUSD(stats.available_balance)}</span>
          </p>
        </div>

        {/* PnL Section */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">Total P&L</h3>
          <p className={`text-2xl font-bold ${stats.total_pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatUSD(stats.total_pnl_usd)}
            <span className="text-sm ml-1">({formatPercentage(stats.total_pnl_percentage)})</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Daily: </span>
            <span className={stats.daily_pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatUSD(stats.daily_pnl_usd)} ({formatPercentage(stats.daily_pnl_percentage)})
            </span>
          </p>
        </div>

        {/* Win Rate Section */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">Win Rate</h3>
          <p className="text-white text-2xl font-bold">{formatPercentage(stats.win_rate)}</p>
          <p className="text-sm">
            <span className="text-green-400">{stats.winning_trades}W</span>
            <span className="text-gray-400"> / </span>
            <span className="text-red-400">{stats.losing_trades}L</span>
            <span className="text-gray-400"> ({stats.total_trades} total)</span>
          </p>
        </div>

        {/* Drawdown Section */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">Drawdown</h3>
          <p className="text-red-400 text-2xl font-bold">{formatPercentage(stats.current_drawdown)}</p>
          <p className="text-sm">
            <span className="text-gray-400">Max: </span>
            <span className="text-red-400">{formatPercentage(stats.max_drawdown)}</span>
          </p>
        </div>

        {/* Average Trade Section */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">Average Trade</h3>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-400">Win</p>
              <p className="text-green-400">{formatUSD(stats.average_win_usd)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Loss</p>
              <p className="text-red-400">{formatUSD(stats.average_loss_usd)}</p>
            </div>
          </div>
          <p className="text-sm mt-1">
            <span className="text-gray-400">R/R: </span>
            <span className="text-white">{formatNumber(stats.risk_reward_ratio, 2)}</span>
          </p>
        </div>

        {/* Peak Balance Section */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">Peak Balance</h3>
          <p className="text-white text-2xl font-bold">{formatUSD(stats.peak_balance)}</p>
        </div>

        {/* Fees Section */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-gray-400 text-sm mb-1">Total Fees</h3>
          <p className="text-white text-2xl font-bold">{formatUSD(stats.total_fees_paid)}</p>
          <p className="text-sm">
            <span className="text-gray-400">Funding: </span>
            <span className="text-white">{formatUSD(stats.total_funding_paid)}</span>
          </p>
        </div>
      </div>
    </div>
  );
} 