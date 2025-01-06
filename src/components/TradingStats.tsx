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

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0.00';
  return Number(num).toFixed(2);
};

const formatCurrency = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '$0.00';
  return `$${Number(num).toFixed(2)}`;
};

export default function TradingStats() {
  const [stats, setStats] = useState<BalanceStats | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/balance');
      if (!response.ok) throw new Error('Failed to fetch balance stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching balance stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700 shadow-lg p-3 sm:p-6">
        <h3 className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Total Balance</h3>
        <div className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(stats.total_balance)}</div>
        <div className="text-sm text-gray-400">Available: {formatCurrency(stats.available_balance)}</div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700 shadow-lg p-3 sm:p-6">
        <h3 className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Total P&L</h3>
        <div className="text-xl sm:text-2xl font-bold text-green-400">{formatCurrency(stats.total_pnl_usd)} ({formatNumber(stats.total_pnl_percentage)}%)</div>
        <div className="text-sm text-gray-400">
          Daily: {formatCurrency(stats.daily_pnl_usd)} ({formatNumber(stats.daily_pnl_percentage)}%)
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700 shadow-lg p-3 sm:p-6">
        <h3 className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Win Rate</h3>
        <div className="text-xl sm:text-2xl font-bold text-white">{formatNumber(stats.win_rate)}%</div>
        <div className="text-sm text-gray-400">
          {stats.winning_trades}W / {stats.losing_trades}L ({stats.total_trades} total)
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700 shadow-lg p-3 sm:p-6">
        <h3 className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Drawdown</h3>
        <div className="text-xl sm:text-2xl font-bold text-red-400">{formatNumber(stats.current_drawdown)}%</div>
        <div className="text-sm text-gray-400">Max: {formatNumber(stats.max_drawdown)}%</div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700 shadow-lg p-3 sm:p-6">
        <h3 className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Average Trade</h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <div className="text-sm text-gray-400">Win</div>
            <div className="text-green-400 font-bold text-sm sm:text-base">{formatCurrency(stats.average_win_usd)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Loss</div>
            <div className="text-red-400 font-bold text-sm sm:text-base">{formatCurrency(stats.average_loss_usd)}</div>
          </div>
        </div>
        <div className="text-sm text-gray-400 mt-1 sm:mt-2">R/R: {formatNumber(stats.risk_reward_ratio)}</div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700 shadow-lg p-3 sm:p-6">
        <h3 className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Peak Balance</h3>
        <div className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(stats.peak_balance)}</div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-700 shadow-lg p-3 sm:p-6">
        <h3 className="text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">Total Fees</h3>
        <div className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(stats.total_fees_paid)}</div>
        <div className="text-sm text-gray-400">Funding: {formatCurrency(stats.total_funding_paid)}</div>
      </div>
    </div>
  );
} 