CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    signal_id VARCHAR(10) REFERENCES signals(id),
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    position_size NUMERIC NOT NULL,  -- in USD
    leverage INTEGER NOT NULL DEFAULT 1,
    pnl_usd NUMERIC,  -- Profit/Loss in USD
    pnl_percentage NUMERIC,  -- Profit/Loss in percentage
    exit_reason VARCHAR(20),  -- 'tp_hit', 'sl_hit', 'manual'
    tp_level INTEGER,  -- Which take profit level was hit (1, 2, 3, etc.)
    entry_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- 'OPEN', 'CLOSED'
    fees_usd NUMERIC DEFAULT 0,  -- Trading fees in USD
    funding_fees_usd NUMERIC DEFAULT 0,  -- Funding fees in USD
    realized_pnl_usd NUMERIC,  -- Final PnL after fees
    trade_duration INTERVAL,  -- How long the trade was held
    max_drawdown_percentage NUMERIC,  -- Maximum drawdown during the trade
    max_profit_percentage NUMERIC,  -- Maximum profit reached during the trade
    notes TEXT  -- Any additional notes or comments about the trade
); 