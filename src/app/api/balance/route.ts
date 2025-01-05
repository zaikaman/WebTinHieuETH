import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function GET() {
  try {
    // Get the latest balance record
    const result = await pool.query(`
      SELECT * FROM balance 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);

    // If no balance record exists, return default values
    if (result.rows.length === 0) {
      return NextResponse.json({
        total_balance: 0,
        available_balance: 0,
        total_pnl_usd: 0,
        total_pnl_percentage: 0,
        daily_pnl_usd: 0,
        daily_pnl_percentage: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        average_win_usd: 0,
        average_loss_usd: 0,
        risk_reward_ratio: 0,
        max_drawdown: 0,
        current_drawdown: 0,
        peak_balance: 0,
        total_fees_paid: 0,
        total_funding_paid: 0
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance data' }, { status: 500 });
  }
} 