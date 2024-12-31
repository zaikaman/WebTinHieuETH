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
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  private ws: WebSocket | null = null;

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
    this.ws = new WebSocket(this.wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Resubscribe to all streams
      this.subscribers.forEach((_, stream) => {
        this.subscribeToStream(stream);
      });
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => this.initWebSocket(), 5000);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const stream = data.stream;
      if (stream && this.subscribers.has(stream)) {
        this.subscribers.get(stream)?.forEach(callback => callback(data));
      }
    };
  }

  private subscribeToStream(stream: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: [stream],
        id: Date.now()
      }));
    }
  }

  private unsubscribeFromStream(stream: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
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

      // Lấy thời gian của nến cuối cùng làm endTime cho lần fetch tiếp theo
      endTime = klines[0][0] - 1;

      // Đợi 100ms để tránh rate limit
      await this.sleep(100);
    }

    return allKlines;
  }

  public async getMarketData(symbol: string): Promise<MarketData> {
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
  }

  public subscribeToKlines(symbol: string, interval: string, callback: (data: any) => void) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, []);
      this.subscribeToStream(stream);
    }
    this.subscribers.get(stream)?.push(callback);
  }

  public subscribeToMarkPrice(symbol: string, callback: (data: any) => void) {
    const stream = `${symbol.toLowerCase()}@markPrice@1s`;
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, []);
      this.subscribeToStream(stream);
    }
    this.subscribers.get(stream)?.push(callback);
  }

  public subscribeToMiniTicker(symbol: string, callback: (data: any) => void) {
    const stream = `${symbol.toLowerCase()}@miniTicker`;
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, []);
      this.subscribeToStream(stream);
    }
    this.subscribers.get(stream)?.push(callback);
  }

  public unsubscribe(symbol: string, interval?: string) {
    const streams = interval 
      ? [`${symbol.toLowerCase()}@kline_${interval}`]
      : Array.from(this.subscribers.keys()).filter(s => s.startsWith(symbol.toLowerCase()));
    
    streams.forEach(stream => {
      this.unsubscribeFromStream(stream);
      this.subscribers.delete(stream);
    });
  }
}

export const binanceService = BinanceService.getInstance(); 