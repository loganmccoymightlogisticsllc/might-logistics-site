-- Run AFTER schema.sql. Creates the two private file buckets and their access rules (Supabase only).
insert into storage.buckets (id, name, public) values ('intake-files','intake-files',false), ('load-docs','load-docs',false)
on conflict (id) do nothing;

-- intake-files: written by the server only. Staff who may read the submission may read its files.
create policy "intake files read" on storage.objects for select to authenticated using (
  bucket_id = 'intake-files' and (is_admin() or app_role() in ('broker','dispatcher')));

-- load-docs: path is "<load id>/<kind>-<file name>". Anyone who can see the load can read and add its documents.
create policy "load docs read" on storage.objects for select to authenticated using (
  bucket_id = 'load-docs' and exists (select 1 from public.loads l where l.id = (storage.foldername(name))[1] and (is_admin() or l.dept = my_dept())));
create policy "load docs add" on storage.objects for insert to authenticated with check (
  bucket_id = 'load-docs' and exists (select 1 from public.loads l where l.id = (storage.foldername(name))[1] and (is_admin() or l.dept = my_dept())));
