import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const updateBalanceStats = async () => {
  // Get current balance first
  const balanceResult = await pool.query(`
    SELECT total_balance 
    FROM balance 
    ORDER BY timestamp DESC 
    LIMIT 1
  `);
  const currentBalance = parseFloat(balanceResult.rows[0].total_balance);

  // Get all signals
  const signalsResult = await pool.query(`
    SELECT * FROM signals
    ORDER BY timestamp DESC
  `);
  const signals = signalsResult.rows;

  // Calculate statistics
  let totalPnlUsd = 0;
  let dailyPnlUsd = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalTrades = 0;
  let totalFeesUsd = 0;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let peakBalance = currentBalance;
  let totalWinAmount = 0;
  let totalLossAmount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  signals.forEach(signal => {
    if (signal.status === 'STOPPED' && signal.exit_price) {
      totalTrades++;
      
      // Use the profit value from the database
      const pnl = parseFloat(signal.profit);

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

      // Calculate fees (0.01% per trade, charged on both entry and exit)
      const riskAmount = (currentBalance * parseFloat(signal.risk_percent)) / 100;
      const stopLossDistance = Math.abs(parseFloat(signal.entry_price) - parseFloat(signal.stop_loss));
      const positionSize = (riskAmount * parseFloat(signal.entry_price)) / stopLossDistance;
      const tradeFee = positionSize * 0.0001 * 2;  // 0.01% on entry and 0.01% on exit
      totalFeesUsd += tradeFee;

      // Update peak balance and drawdown
      const currentTotalBalance = currentBalance + totalPnlUsd - totalFeesUsd;
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
  const totalPnlPercentage = (totalPnlUsd / currentBalance) * 100;
  const dailyPnlPercentage = (dailyPnlUsd / currentBalance) * 100;

  // Calculate available balance
  const availableBalance = currentBalance + totalPnlUsd - totalFeesUsd;

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
      WITH current_balance AS (
        SELECT total_balance 
        FROM balance 
        ORDER BY timestamp DESC 
        LIMIT 1
      )
      SELECT s.*, 
        CASE 
          WHEN s.status = 'STOPPED' AND s.exit_price IS NOT NULL THEN
            CASE 
              WHEN s.type = 'LONG' THEN 
                ((s.exit_price - s.entry_price) / s.entry_price) * ((b.total_balance * s.risk_percent / 100 * s.entry_price) / ABS(s.entry_price - s.stop_loss))
              ELSE 
                ((s.entry_price - s.exit_price) / s.entry_price) * ((b.total_balance * s.risk_percent / 100 * s.entry_price) / ABS(s.entry_price - s.stop_loss))
            END
          ELSE NULL
        END as profit
      FROM signals s
      CROSS JOIN current_balance b
    `;

    if (status && status !== 'all') {
      query += ` WHERE status = $1`;
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await pool.query(
      query,
      status && status !== 'all' ? [status.toUpperCase()] : []
    );

    // Find stopped trades that haven't been processed yet
    const unprocessedSignals = result.rows.filter(signal => 
      signal.status === 'STOPPED' && 
      signal.exit_price && 
      signal.profit !== null && 
      !signal.updated
    );

    if (unprocessedSignals.length > 0) {
      // Update profits and mark as processed
      await Promise.all(
        unprocessedSignals.map(signal => 
          pool.query(
            `UPDATE signals SET profit = $1, updated = TRUE WHERE id = $2`,
            [Number(signal.profit), signal.id]
          )
        )
      );

      // Update balance stats since we have new processed trades
      await updateBalanceStats();
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
} 