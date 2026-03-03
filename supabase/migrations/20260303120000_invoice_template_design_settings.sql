-- Extend invoice_templates with structured design settings
-- Generated: 2026-03-03

begin;

alter table if exists public.invoice_templates
  add column if not exists secondary_color text,
  add column if not exists font_family text default 'helvetica',
  add column if not exists logo_position text default 'left',
  add column if not exists show_abn boolean default true,
  add column if not exists show_due_date boolean default true,
  add column if not exists show_notes boolean default true,
  add column if not exists table_style text default 'minimal',
  add column if not exists footer_text text;

commit;

