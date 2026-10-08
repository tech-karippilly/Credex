create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other services',
  paid_by text not null,
  amount numeric(12,2) not null default 0,
  expense_date date not null default current_date,
  notes text not null default '',
  receipt_path text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "expenses admin all" on public.expenses for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_no bigint generated always as identity (start with 1001),
  expense_id uuid references public.expenses(id) on delete set null,
  payee text not null,
  details text not null default '',
  amount numeric(12,2) not null default 0,
  voucher_date date not null default current_date,
  payment_mode text not null default 'Paid on behalf of company',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vouchers to authenticated;
grant all on public.vouchers to service_role;
alter table public.vouchers enable row level security;
create policy "vouchers admin all" on public.vouchers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "receipts admin read" on storage.objects for select to authenticated using (bucket_id = 'receipts' and public.has_role(auth.uid(),'admin'));
create policy "receipts admin write" on storage.objects for insert to authenticated with check (bucket_id = 'receipts' and public.has_role(auth.uid(),'admin'));
create policy "receipts admin delete" on storage.objects for delete to authenticated using (bucket_id = 'receipts' and public.has_role(auth.uid(),'admin'));