-- Drop the table if it exists
DROP TABLE IF EXISTS balance;

-- Create the balance table
CREATE TABLE balance (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_balance NUMERIC NOT NULL,  -- Current total balance in USD
    available_balance NUMERIC NOT NULL,  -- Available balance (not in positions)
    total_pnl_usd NUMERIC NOT NULL DEFAULT 0,  -- Total profit/loss in USD
    total_pnl_percentage NUMERIC NOT NULL DEFAULT 0,  -- Total profit/loss percentage
    daily_pnl_usd NUMERIC NOT NULL DEFAULT 0,  -- Daily profit/loss in USD
    daily_pnl_percentage NUMERIC NOT NULL DEFAULT 0,  -- Daily profit/loss percentage
    total_trades INTEGER NOT NULL DEFAULT 0,  -- Total number of trades taken
    winning_trades INTEGER NOT NULL DEFAULT 0,  -- Number of winning trades
    losing_trades INTEGER NOT NULL DEFAULT 0,  -- Number of losing trades
    win_rate NUMERIC NOT NULL DEFAULT 0,  -- Win rate percentage
    average_win_usd NUMERIC NOT NULL DEFAULT 0,  -- Average profit per winning trade
    average_loss_usd NUMERIC NOT NULL DEFAULT 0,  -- Average loss per losing trade
    risk_reward_ratio NUMERIC NOT NULL DEFAULT 0,  -- Risk/Reward ratio
    max_drawdown NUMERIC NOT NULL DEFAULT 0,  -- Maximum drawdown percentage
    current_drawdown NUMERIC NOT NULL DEFAULT 0,  -- Current drawdown percentage
    peak_balance NUMERIC NOT NULL,  -- Highest balance reached
    total_fees_paid NUMERIC NOT NULL DEFAULT 0,  -- Total trading fees paid
    total_funding_paid NUMERIC NOT NULL DEFAULT 0  -- Total funding fees paid
);

-- Insert initial record with starting balance of $10,000
INSERT INTO balance (
    total_balance,
    available_balance,
    peak_balance
) VALUES (
    10,  -- Starting with $10,000
    10,  -- All available initially
    10   -- Initial peak balance
); 