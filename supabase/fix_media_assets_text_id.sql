-- Run this if an earlier schema created media_assets.id as uuid.
-- Frontend media ids are strings such as media-lz0abc1-xxxx.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'media_assets'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    alter table public.media_assets alter column id drop default;
    alter table public.media_assets alter column id type text using id::text;
  end if;
end $$;
