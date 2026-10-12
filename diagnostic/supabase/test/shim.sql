-- Minimal stand-in for Supabase's auth and storage schemas, for testing migrations on plain Postgres.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean);
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema auth, public to authenticated;
