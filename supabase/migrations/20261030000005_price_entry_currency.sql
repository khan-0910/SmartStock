-- Prices (cost_price, selling_price) are stored in USD. These columns record
-- what the user actually typed: the currency of the entry and the exchange
-- rate used (units of that currency per 1 USD), so the conversion is
-- auditable. Existing rows were entered in USD.

alter table public.products
  add column price_currency text not null default 'USD'
    check (price_currency in ('USD', 'EUR', 'GBP', 'JPY', 'INR', 'SGD')),
  add column price_fx_rate numeric(18, 8) not null default 1
    check (price_fx_rate > 0),
  add constraint products_usd_rate_check check (price_currency <> 'USD' or price_fx_rate = 1);

grant insert (price_currency, price_fx_rate), update (price_currency, price_fx_rate) on public.products to authenticated;
