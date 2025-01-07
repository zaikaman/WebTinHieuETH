import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

interface Signal {
  id: string;
  type: string;
  entry_price: string;
  exit_price: string | null;
  take_profit: number[];
  stop_loss: string;
  timestamp: string;
  status: string;
  risk_percent: string;
  current_price: string;
}

export async function POST() {
  try {
    // Get all signals
    const signalsResult = await pool.query(`
      SELECT * FROM signals
      ORDER BY timestamp DESC
    `);
    const signals: Signal[] = signalsResult.rows;

    const INITIAL_BALANCE = 10; // Fixed initial balance

    // Calculate statistics
    let totalPnlUsd = 0;
    let dailyPnlUsd = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalTrades = 0;
    let totalFeesUsd = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    signals.forEach(signal => {
      if (signal.status === 'STOPPED' && signal.exit_price) {
        totalTrades++;
        
        // Convert string values to numbers
        const entryPrice = parseFloat(signal.entry_price);
        const exitPrice = parseFloat(signal.exit_price);
        const stopLoss = parseFloat(signal.stop_loss);
        const riskPercent = parseFloat(signal.risk_percent);
        
        // Calculate position size based on risk
        const riskAmount = (INITIAL_BALANCE * riskPercent) / 100;
        const stopLossDistance = Math.abs(entryPrice - stopLoss);
        const positionSize = (riskAmount * entryPrice) / stopLossDistance;
        
        // Calculate PnL
        const priceDiff = exitPrice - entryPrice;
        const pnl = signal.type === 'LONG' ? 
          (priceDiff / entryPrice) * positionSize :
          (-priceDiff / entryPrice) * positionSize;

        console.log('Trade calculation:', {
          entryPrice,
          exitPrice,
          stopLoss,
          riskPercent,
          riskAmount,
          stopLossDistance,
          positionSize,
          priceDiff,
          pnl
        });

        // Update total PnL
        totalPnlUsd += pnl;

        // Update daily PnL
        const signalDate = new Date(signal.timestamp);
        if (signalDate >= today) {
          dailyPnlUsd += pnl;
        }

        // Update win/loss counts and amounts
        if (pnl > 0) {
          winningTrades++;
          totalWinAmount += pnl;
        } else {
          losingTrades++;
          totalLossAmount += Math.abs(pnl);
        }

        // Calculate fees (assuming 0.1% per trade)
        const tradeFee = positionSize * 0.001;
        totalFeesUsd += tradeFee;

        // Update drawdown
        const currentBalance = INITIAL_BALANCE + totalPnlUsd - totalFeesUsd;
        const drawdown = ((INITIAL_BALANCE - currentBalance) / INITIAL_BALANCE) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
        currentDrawdown = drawdown;
      }
    });

    // Calculate averages and percentages
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const averageWinUsd = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
    const averageLossUsd = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
    const riskRewardRatio = averageLossUsd > 0 ? averageWinUsd / averageLossUsd : 0;
    const totalPnlPercentage = (totalPnlUsd / INITIAL_BALANCE) * 100;
    const dailyPnlPercentage = (dailyPnlUsd / INITIAL_BALANCE) * 100;

    // Calculate available balance (using initial balance)
    const availableBalance = INITIAL_BALANCE + totalPnlUsd - totalFeesUsd;

    // Update balance record
    await pool.query(`
      UPDATE balance 
      SET 
        available_balance = $1,
        total_pnl_usd = $2,
        total_pnl_percentage = $3,
        daily_pnl_usd = $4,
        daily_pnl_percentage = $5,
        total_trades = $6,
        winning_trades = $7,
        losing_trades = $8,
        win_rate = $9,
        average_win_usd = $10,
        average_loss_usd = $11,
        risk_reward_ratio = $12,
        max_drawdown = $13,
        current_drawdown = $14,
        total_fees_paid = $15,
        total_funding_paid = $16,
        timestamp = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM balance ORDER BY timestamp DESC LIMIT 1)
    `, [
      availableBalance,
      totalPnlUsd,
      totalPnlPercentage,
      dailyPnlUsd,
      dailyPnlPercentage,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      averageWinUsd,
      averageLossUsd,
      riskRewardRatio,
      maxDrawdown,
      currentDrawdown,
      totalFeesUsd,
      0 // Funding fees (would need additional data to calculate)
    ]);

    return NextResponse.json({ 
      message: 'Balance updated successfully',
      stats: {
        totalPnlUsd,
        winRate,
        totalTrades
      }
    });
  } catch (error) {
    console.error('Error updating balance:', error);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
} 