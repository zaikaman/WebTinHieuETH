'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, SeriesMarker, Time } from 'lightweight-charts';
import { binanceService } from '@/services/binance';

interface MarketStats {
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  high: string;
  low: string;
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
}

interface Trade {
  time: number;
  type: 'LONG' | 'SHORT';
  entry: number;
  takeProfit: number[];
  stopLoss: number;
  status: 'ACTIVE' | 'COMPLETED' | 'STOPPED';
}

const TIMEFRAME_MS: { [key: string]: number } = {
  '1m': 60000,
  '5m': 300000,
  '15m': 900000,
  '1h': 3600000,
  '4h': 14400000,
  '1d': 86400000,
};

export default function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [timeframe, setTimeframe] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const [stats, setStats] = useState<MarketStats>({
    price: '0',
    priceChange: '0',
    priceChangePercent: '0',
    volume: '0',
    high: '0',
    low: '0',
    markPrice: '0',
    indexPrice: '0',
    fundingRate: '0'
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeframeMs = TIMEFRAME_MS[timeframe];
      const nextCandleTime = Math.ceil(now / timeframeMs) * timeframeMs;
      const remaining = nextCandleTime - now;
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeframe]);

  const addTradeMarkers = (trade: Trade) => {
    if (!candleSeriesRef.current) return;

    // Entry marker
    const entryMarker: SeriesMarker<Time> = {
      time: trade.time as UTCTimestamp,
      position: trade.type === 'LONG' ? 'belowBar' : 'aboveBar',
      color: trade.type === 'LONG' ? '#10b981' : '#ef4444',
      shape: trade.type === 'LONG' ? 'arrowUp' : 'arrowDown',
      text: `${trade.type} Entry @ ${trade.entry}`,
    };

    // Take profit markers
    const tpMarkers: SeriesMarker<Time>[] = trade.takeProfit.map((tp, index) => ({
      time: trade.time as UTCTimestamp,
      position: 'aboveBar',
      color: '#10b981',
      shape: 'circle',
      text: `TP${index + 1} @ ${tp}`,
    }));

    // Stop loss marker
    const slMarker: SeriesMarker<Time> = {
      time: trade.time as UTCTimestamp,
      position: 'belowBar',
      color: '#ef4444',
      shape: 'circle',
      text: `SL @ ${trade.stopLoss}`,
    };

    // Add all markers
    candleSeriesRef.current.setMarkers([entryMarker, ...tpMarkers, slMarker]);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(107, 114, 128, 0.2)' },
        horzLines: { color: 'rgba(107, 114, 128, 0.2)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(107, 114, 128, 0.5)',
      },
      timeScale: {
        borderColor: 'rgba(107, 114, 128, 0.5)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: '#9ca3af',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#9ca3af',
          width: 1,
          style: 3,
        },
      },
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Example trade (you can modify this based on your needs)
    const exampleTrade: Trade = {
      time: Math.floor(Date.now() / 1000),
      type: 'LONG',
      entry: 3340,
      takeProfit: [3400, 3450, 3500],
      stopLoss: 3300,
      status: 'ACTIVE'
    };

    // Add trade markers after data is loaded
    setTimeout(() => {
      addTradeMarkers(exampleTrade);
    }, 2000);

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    const symbol = 'ETHUSDT';

    async function fetchInitialData() {
      try {
        setIsLoading(true);
        const [klines, marketData] = await Promise.all([
          binanceService.getKlines(symbol, timeframe, 10000),
          binanceService.getMarketData(symbol)
        ]);

        // Update chart data
        const candleData: CandlestickData[] = klines.map((d: any[]) => ({
          time: (d[0] / 1000) as UTCTimestamp,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(candleData);
        }

        // Update market stats
        setStats({
          price: marketData.ticker.lastPrice,
          priceChange: marketData.ticker.priceChange,
          priceChangePercent: marketData.ticker.priceChangePercent,
          volume: marketData.ticker.volume,
          high: marketData.ticker.highPrice,
          low: marketData.ticker.lowPrice,
          markPrice: marketData.markPrice,
          indexPrice: marketData.indexPrice,
          fundingRate: marketData.fundingRate
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    // Subscribe to real-time updates
    binanceService.subscribeToKlines(symbol, timeframe, (data) => {
      if (candleSeriesRef.current) {
        const k = data.data.k;
        const candle = {
          time: (k.t / 1000) as UTCTimestamp,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
        };
        candleSeriesRef.current.update(candle);
      }
    });

    binanceService.subscribeToMarkPrice(symbol, (data) => {
      setStats(prev => ({
        ...prev,
        markPrice: data.data.p,
        indexPrice: data.data.i,
      }));
    });

    binanceService.subscribeToMiniTicker(symbol, (data) => {
      setStats(prev => ({
        ...prev,
        price: data.data.c,
        high: data.data.h,
        low: data.data.l,
        volume: data.data.v,
      }));
    });

    fetchInitialData();

    return () => {
      binanceService.unsubscribe(symbol, timeframe);
    };
  }, [timeframe]);

  const formatNumber = (value: string | number, decimals: number = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatVolume = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-white">ETHUSDT Perpetual</h2>
            <div className={`px-2 py-1 rounded text-sm ${
              parseFloat(stats.priceChangePercent) >= 0
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {formatNumber(stats.priceChangePercent, 2)}%
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Price: </span>
              <span className="text-white font-medium">${formatNumber(stats.price)}</span>
            </div>
            <div>
              <span className="text-gray-400">Mark: </span>
              <span className="text-white font-medium">${formatNumber(stats.markPrice)}</span>
            </div>
            <div>
              <span className="text-gray-400">Index: </span>
              <span className="text-white font-medium">${formatNumber(stats.indexPrice)}</span>
            </div>
            <div>
              <span className="text-gray-400">24h Vol: </span>
              <span className="text-white font-medium">${formatVolume(stats.volume)}</span>
            </div>
            <div>
              <span className="text-gray-400">24h High: </span>
              <span className="text-white font-medium">${formatNumber(stats.high)}</span>
            </div>
            <div>
              <span className="text-gray-400">24h Low: </span>
              <span className="text-white font-medium">${formatNumber(stats.low)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">Funding Rate: </span>
              <span className={`font-medium ${
                parseFloat(stats.fundingRate) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>{formatNumber(parseFloat(stats.fundingRate) * 100, 4)}%</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
              Indicators
            </button>
            <select 
              className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 border-0 focus:ring-2 focus:ring-green-500"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1D</option>
            </select>
          </div>
          <div className="text-sm text-gray-400">
            Next candle in: <span className="text-white font-medium">{countdown}</span>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[600px] bg-gray-900/50 rounded-lg border border-gray-700">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-green-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-400">Loading chart...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 