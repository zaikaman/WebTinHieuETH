import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new pool for each request
const getPool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    // Add connection limits suitable for serverless
    max: 1,
    idleTimeoutMillis: 120000
  });
};

// Helper function to format numbers to 2 decimal places
function formatNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number(Number(num).toFixed(2));
}

export async function GET(request: Request) {
  const pool = getPool();
  try {
    // Get status from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = 'SELECT * FROM signals';
    let values: string[] = [];

    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      values.push(status.toUpperCase());
    }

    query += ' ORDER BY timestamp DESC';

    const result = await pool.query(query, values);
    
    // Format numbers in the response
    const formattedRows = result.rows.map(row => ({
      ...row,
      entry_price: formatNumber(row.entry_price),
      take_profit: Array.isArray(row.take_profit) 
        ? row.take_profit.map((tp: any) => formatNumber(tp))
        : [],
      stop_loss: formatNumber(row.stop_loss),
      current_price: formatNumber(row.current_price),
      risk_percent: formatNumber(row.risk_percent)
    }));

    await pool.end(); // Important: close the pool after use
    return NextResponse.json(formattedRows);
  } catch (error) {
    console.error('Error fetching signals:', error);
    await pool.end(); // Make sure to close the pool even if there's an error
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
} 