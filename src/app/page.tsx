import TradingChart from '@/components/TradingChart';
import SignalsList from '@/components/SignalsList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">ETH Trading Signals</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm px-6 py-3 rounded-xl border border-gray-700 shadow-lg">
              <span className="font-semibold text-gray-400">ETHUSDT</span>
              <span className="ml-3 text-green-400 font-bold text-xl">$2,250.50</span>
              <span className="ml-2 text-green-400 text-sm">+2.5%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <TradingChart />
          <SignalsList />
        </div>
      </div>
    </main>
  )
}
