-- WriteLite Writer Studio V3 — cumulative schema source
-- Sprint 1: rich-editor companion content.
-- Canonical public-compatible chapter text remains public.chapters.content.

alter table public.chapters
  add column if not exists content_rich text;

comment on column public.chapters.content_rich is
  'Writer Studio V3 optional rich-editor HTML. Canonical public-compatible plain text remains content.';
