interface TickerData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  lastQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

interface MarketData {
  ticker: TickerData;
  markPrice: string;
  indexPrice: string;
  estimatedSettlePrice: string;
  fundingRate: string;
  nextFundingTime: number;
}

class BinanceService {
  private static instance: BinanceService;
  private baseUrl = 'https://fapi.binance.com';
  private wsUrl = 'wss://fstream.binance.com/ws';
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private subscriptionQueue: string[] = [];

  private constructor() {
    this.initWebSocket();
  }

  public static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  private initWebSocket() {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.close();
      }

      console.log('[WS] Initializing connection...');
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('[WS] Connected successfully');
        this.reconnectAttempts = 0;

        // Setup ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ method: 'ping' }));
          }
        }, 30000);

        // Process subscription queue
        while (this.subscriptionQueue.length > 0) {
          const stream = this.subscriptionQueue.shift();
          if (stream) this.subscribeToStream(stream);
        }

        // Resubscribe to existing streams
        const streams = Array.from(this.subscribers.keys());
        if (streams.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
          console.log('[WS] Resubscribing to streams:', streams);
          this.ws.send(JSON.stringify({
            method: 'SUBSCRIBE',
            params: streams,
            id: Date.now()
          }));
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        this.cleanup();
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle ping/pong
          if (data.ping) {
            this.ws?.send(JSON.stringify({ pong: data.ping }));
            return;
          }

          // Handle subscription response
          if (data.result === null && data.id) {
            console.log('[WS] Successfully subscribed to streams');
            return;
          }

          // Handle stream data
          if (data.e === 'kline') {
            const callbacks = this.subscribers.get(`${data.s.toLowerCase()}@kline_${data.k.i}`);
            if (callbacks) {
              callbacks.forEach(callback => {
                try {
                  callback({ data });
                } catch (err) {
                  console.error('[WS] Error in callback:', err);
                }
              });
            }
          } else if (data.e === 'markPrice') {
            const callbacks = this.subscribers.get(`${data.s.toLowerCase()}@markPrice@1s`);
            if (callbacks) {
              callbacks.forEach(callback => {
                try {
                  callback({ data });
                } catch (err) {
                  console.error('[WS] Error in callback:', err);
                }
              });
            }
          } else if (data.e === '24hrMiniTicker') {
            const callbacks = this.subscribers.get(`${data.s.toLowerCase()}@miniTicker`);
            if (callbacks) {
              callbacks.forEach(callback => {
                try {
                  callback({ data });
                } catch (err) {
                  console.error('[WS] Error in callback:', err);
                }
              });
            }
          }
        } catch (err) {
          console.error('[WS] Error processing message:', err);
        }
      };
    } catch (err) {
      console.error('[WS] Error initializing:', err);
      this.reconnect();
    }
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WS] Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.initWebSocket();
    }, delay);
  }

  private subscribeToStream(stream: string) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.log('[WS] Connection not ready, queueing stream:', stream);
      if (!this.subscriptionQueue.includes(stream)) {
        this.subscriptionQueue.push(stream);
      }
      return;
    }

    console.log('[WS] Subscribing to stream:', stream);
    this.ws.send(JSON.stringify({
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now()
    }));
  }

  private unsubscribeFromStream(stream: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Unsubscribing from stream:', stream);
      this.ws.send(JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: [stream],
        id: Date.now()
      }));
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getKlines(symbol: string, interval: string, limit: number = 1000): Promise<any[]> {
    try {
      if (limit <= 1000) {
        const response = await fetch(
          `${this.baseUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        return response.json();
      }

      // Nếu cần lấy nhiều hơn 1000 nến
      const batches = Math.ceil(limit / 1000);
      let allKlines: any[] = [];
      let endTime = Date.now();

      for (let i = 0; i < batches; i++) {
        const url = `${this.baseUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1000${
          endTime ? `&endTime=${endTime}` : ''
        }`;

        const response = await fetch(url);
        const klines = await response.json();

        if (klines.length === 0) break;

        allKlines = [...klines, ...allKlines];
        
        if (allKlines.length >= limit) {
          allKlines = allKlines.slice(0, limit);
          break;
        }

        endTime = klines[0][0] - 1;
        await this.sleep(100);
      }

      return allKlines;
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw error;
    }
  }

  public async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const [ticker, markPrice, fundingRate] = await Promise.all([
        fetch(`${this.baseUrl}/fapi/v1/ticker/24hr?symbol=${symbol}`).then(res => res.json()),
        fetch(`${this.baseUrl}/fapi/v1/premiumIndex?symbol=${symbol}`).then(res => res.json()),
        fetch(`${this.baseUrl}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`).then(res => res.json().then(data => data[0]))
      ]);

      return {
        ticker,
        markPrice: markPrice.markPrice,
        indexPrice: markPrice.indexPrice,
        estimatedSettlePrice: markPrice.estimatedSettlePrice,
        fundingRate: fundingRate.fundingRate,
        nextFundingTime: fundingRate.nextFundingTime
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  public subscribeToKlines(symbol: string, interval: string, callback: (data: any) => void) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, new Set());
      this.subscribeToStream(stream);
    }
    this.subscribers.get(stream)?.add(callback);
    console.log(`[WS] Subscribed to klines stream: ${stream}`);
  }

  public subscribeToMarkPrice(symbol: string, callback: (data: any) => void) {
    const stream = `${symbol.toLowerCase()}@markPrice@1s`;
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, new Set());
      this.subscribeToStream(stream);
    }
    this.subscribers.get(stream)?.add(callback);
    console.log(`[WS] Subscribed to mark price stream: ${stream}`);
  }

  public subscribeToMiniTicker(symbol: string, callback: (data: any) => void) {
    const stream = `${symbol.toLowerCase()}@miniTicker`;
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, new Set());
      this.subscribeToStream(stream);
    }
    this.subscribers.get(stream)?.add(callback);
    console.log(`[WS] Subscribed to mini ticker stream: ${stream}`);
  }

  public unsubscribe(symbol: string, interval?: string) {
    const streams = interval 
      ? [`${symbol.toLowerCase()}@kline_${interval}`]
      : Array.from(this.subscribers.keys()).filter(s => s.startsWith(symbol.toLowerCase()));
    
    streams.forEach(stream => {
      this.unsubscribeFromStream(stream);
      this.subscribers.delete(stream);
      console.log(`[WS] Unsubscribed from stream: ${stream}`);
    });
  }
}

export const binanceService = BinanceService.getInstance(); 