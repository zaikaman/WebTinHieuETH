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
  entry_price: number;
  take_profit: number[];
  stop_loss: number;
  timestamp: string;
  status: string;
  risk_percent: number;
  current_price: number;
}

export async function POST() {
  try {
    // Get all signals
    const signalsResult = await pool.query(`
      SELECT * FROM signals
      ORDER BY timestamp DESC
    `);
    const signals: Signal[] = signalsResult.rows;

    // Get current balance record
    const balanceResult = await pool.query(`
      SELECT * FROM balance
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    const currentBalance = balanceResult.rows[0];

    // Calculate statistics
    let totalPnlUsd = 0;
    let dailyPnlUsd = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalTrades = 0;
    let totalFeesUsd = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let peakBalance = currentBalance.peak_balance;
    let totalWinAmount = 0;
    let totalLossAmount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    signals.forEach(signal => {
      if (signal.status === 'STOPPED') {
        totalTrades++;
        
        // Calculate PnL for this trade
        const positionSize = (currentBalance.total_balance * signal.risk_percent) / 100;
        const priceDiff = signal.current_price - signal.entry_price;
        const pnl = signal.type === 'LONG' ? 
          (priceDiff / signal.entry_price) * positionSize :
          (-priceDiff / signal.entry_price) * positionSize;

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

        // Update peak balance and drawdown
        const currentTotalBalance = currentBalance.total_balance + totalPnlUsd - totalFeesUsd;
        if (currentTotalBalance > peakBalance) {
          peakBalance = currentTotalBalance;
        }
        const drawdown = ((peakBalance - currentTotalBalance) / peakBalance) * 100;
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
    const totalPnlPercentage = (totalPnlUsd / currentBalance.total_balance) * 100;
    const dailyPnlPercentage = (dailyPnlUsd / currentBalance.total_balance) * 100;

    // Calculate available balance (assuming all completed trades are closed)
    const availableBalance = currentBalance.total_balance + totalPnlUsd - totalFeesUsd;

    // Update balance record
    await pool.query(`
      INSERT INTO balance (
        total_balance,
        available_balance,
        total_pnl_usd,
        total_pnl_percentage,
        daily_pnl_usd,
        daily_pnl_percentage,
        total_trades,
        winning_trades,
        losing_trades,
        win_rate,
        average_win_usd,
        average_loss_usd,
        risk_reward_ratio,
        max_drawdown,
        current_drawdown,
        peak_balance,
        total_fees_paid,
        total_funding_paid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      availableBalance,
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
      peakBalance,
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