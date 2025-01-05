import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT s.*, 
        CASE 
          WHEN s.status = 'STOPPED' AND s.exit_price IS NOT NULL THEN
            CASE 
              WHEN s.type = 'LONG' THEN (s.exit_price - s.entry_price) * (10 * s.risk_percent / 100)
              ELSE (s.entry_price - s.exit_price) * (10 * s.risk_percent / 100)
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
    const updatePromises = result.rows
      .filter(signal => signal.status === 'STOPPED' && signal.exit_price && signal.profit !== null)
      .map(signal => 
        pool.query(
          `UPDATE signals SET profit = $1 WHERE id = $2 AND (profit IS NULL OR profit != $1)`,
          [Number(signal.profit), signal.id]
        )
      );

    await Promise.all(updatePromises);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
} 