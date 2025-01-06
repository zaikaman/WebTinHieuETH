'use client';

import { useEffect, useState } from 'react';
import TradingStats from '@/components/TradingStats';
import TradingChart from '@/components/TradingChart';
import SignalsList from '@/components/SignalsList';
import { binanceService } from '@/services/binance';

interface MarketStats {
  price: string;
  priceChangePercent: string;
}

export default function Home() {
  const [stats, setStats] = useState<MarketStats>({
    price: '0',
    priceChangePercent: '0'
  });

  useEffect(() => {
    // Initial fetch
    const fetchInitialData = async () => {
      try {
        const marketData = await binanceService.getMarketData('ETHUSDT');
        setStats({
          price: marketData.ticker.lastPrice,
          priceChangePercent: marketData.ticker.priceChangePercent
        });
      } catch (error) {
        console.error('Error fetching initial market data:', error);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    binanceService.subscribeToMiniTicker('ETHUSDT', (data) => {
      const tickerData = data.data;
      setStats({
        price: tickerData.c,
        priceChangePercent: ((parseFloat(tickerData.c) - parseFloat(tickerData.o)) / parseFloat(tickerData.o) * 100).toString()
      });
    });

    // Cleanup
    return () => {
      binanceService.unsubscribe('ETHUSDT');
    };
  }, []);

  const formatNumber = (value: string, decimals: number = 2) => {
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75c-1.036 0-1.875-.84-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75C3.84 21.75 3 20.91 3 19.875v-6.75z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">ETH Trading Signals</h1>
          </div>
          <div className="px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">ETHUSDT</span>
              <span className="text-2xl font-bold text-white">${formatNumber(stats.price)}</span>
              <span className={`${parseFloat(stats.priceChangePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {parseFloat(stats.priceChangePercent) >= 0 ? '+' : ''}{formatNumber(stats.priceChangePercent)}%
              </span>
            </div>
          </div>
        </div>

        <TradingStats />
        <TradingChart />
        <SignalsList />
      </div>
    </main>
  );
}
