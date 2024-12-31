'use client';

interface Signal {
  id: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfit: number[];
  stopLoss: number;
  timestamp: string;
  status: 'ACTIVE' | 'COMPLETED' | 'STOPPED';
}

export default function SignalsList() {
  const signals: Signal[] = [
    {
      id: '1',
      type: 'LONG',
      entryPrice: 2250.5,
      takeProfit: [2300, 2350, 2400],
      stopLoss: 2200,
      timestamp: '2023-12-31T12:00:00Z',
      status: 'ACTIVE'
    },
    {
      id: '2',
      type: 'SHORT',
      entryPrice: 2300,
      takeProfit: [2250, 2200],
      stopLoss: 2350,
      timestamp: '2023-12-31T11:00:00Z',
      status: 'COMPLETED'
    }
  ];

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Trading Signals</h2>
          <div className="flex gap-3 text-sm">
            <span className="text-gray-400">Active: 5</span>
            <span className="text-gray-400">Completed: 12</span>
            <span className="text-gray-400">Win Rate: 75%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 border-0 focus:ring-2 focus:ring-green-500">
            <option value="all">Tất cả tín hiệu</option>
            <option value="active">Đang hoạt động</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="stopped">Đã dừng</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Loại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Giá vào</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Take Profit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stop Loss</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Thời gian</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Trạng thái</th>
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
                  <span className="text-white font-medium">${signal.entryPrice}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {signal.takeProfit.map((tp, index) => (
                      <span key={index} className="text-green-400 font-medium">${tp}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-red-400 font-medium">${signal.stopLoss}</span>
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