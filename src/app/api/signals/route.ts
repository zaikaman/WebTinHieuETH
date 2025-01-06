import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const updateBalanceStats = async () => {
  // Get all signals
  const signalsResult = await pool.query(`
    SELECT * FROM signals
    ORDER BY timestamp DESC
  `);
  const signals = signalsResult.rows;

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
  let peakBalance = INITIAL_BALANCE;
  let totalWinAmount = 0;
  let totalLossAmount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  signals.forEach(signal => {
    if (signal.status === 'STOPPED' && signal.exit_price) {
      totalTrades++;
      
      // Calculate PnL for this trade
      const positionSize = (INITIAL_BALANCE * signal.risk_percent) / 100;
      const priceDiff = signal.exit_price - signal.entry_price;
      const pnl = signal.type === 'LONG' ? 
        ((priceDiff) / signal.entry_price) * positionSize :
        ((-priceDiff) / signal.entry_price) * positionSize;

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
      const currentTotalBalance = INITIAL_BALANCE + totalPnlUsd - totalFeesUsd;
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
  const totalPnlPercentage = (totalPnlUsd / INITIAL_BALANCE) * 100;
  const dailyPnlPercentage = (dailyPnlUsd / INITIAL_BALANCE) * 100;

  // Calculate available balance
  const availableBalance = INITIAL_BALANCE + totalPnlUsd - totalFeesUsd;

  // Update balance record
  await pool.query(`
    UPDATE balance 
    SET 
      total_balance = $1,
      available_balance = $2,
      total_pnl_usd = $3,
      total_pnl_percentage = $4,
      daily_pnl_usd = $5,
      daily_pnl_percentage = $6,
      total_trades = $7,
      winning_trades = $8,
      losing_trades = $9,
      win_rate = $10,
      average_win_usd = $11,
      average_loss_usd = $12,
      risk_reward_ratio = $13,
      max_drawdown = $14,
      current_drawdown = $15,
      peak_balance = $16,
      total_fees_paid = $17,
      total_funding_paid = $18,
      timestamp = CURRENT_TIMESTAMP
    WHERE id = (SELECT id FROM balance ORDER BY timestamp DESC LIMIT 1)
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
    0 // Funding fees
  ]);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT s.*, 
        CASE 
          WHEN s.status = 'STOPPED' AND s.exit_price IS NOT NULL THEN
            CASE 
              WHEN s.type = 'LONG' THEN ((s.exit_price - s.entry_price) / s.entry_price) * (10 * s.risk_percent / 100)
              ELSE ((s.entry_price - s.exit_price) / s.entry_price) * (10 * s.risk_percent / 100)
            END
          ELSE NULL
        END as profit
      FROM signals s
    `;

    if (status && status !== 'all') {
      query += ` WHERE status = $1`;
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await pool.query(
      query,
      status && status !== 'all' ? [status.toUpperCase()] : []
    );

    // Update profit in database for completed trades
    const stoppedSignals = result.rows.filter(signal => 
      signal.status === 'STOPPED' && signal.exit_price && signal.profit !== null
    );

    if (stoppedSignals.length > 0) {
      // Update profits first
      await Promise.all(
        stoppedSignals.map(signal => 
          pool.query(
            `UPDATE signals SET profit = $1 WHERE id = $2 AND (profit IS NULL OR profit != $1)`,
            [Number(signal.profit), signal.id]
          )
        )
      );

      // Then update balance stats
      await updateBalanceStats();
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
} 