-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

-- ===== TABLES =====
create table categories (            -- Game Dev, Graphic Design, ... (add/rename/hide in /admin)
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null,
  sort_order int default 0, is_hidden bool default false,
  layout text default 'standard');   -- 'program' = blog-style fields in the editor

create table folders (               -- one level only: no parent column
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, client text, description text);

create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null, slug text unique not null, summary text, description text,
  status text default 'draft',       -- 'draft' (hidden) or 'published'
  year int, client text,
  folder_id uuid references folders on delete set null,   -- deleting a folder just unfiles its projects
  thumbnail_path text, external_url text,                 -- external_url = facebook/insta/youtube link
  cta_label text, cta_url text,                           -- e.g. "Play on itch.io"
  program_data jsonb default '{}',                        -- blog-style fields for Programs & Projects
  photo_consent bool default false,                       -- admin-only reminder
  created_at timestamptz default now());

create table project_categories (    -- a project can sit in many categories (stored once)
  project_id uuid references projects on delete cascade,
  category_id uuid references categories on delete restrict,  -- RESTRICT = a non-empty category can't be deleted
  is_pinned bool default false,
  primary key (project_id, category_id));
create unique index one_pin_per_category on project_categories (category_id) where is_pinned;

create table project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade,
  path text not null, w int, h int, alt text, caption text, sort_order int default 0);

create table site_settings (id int primary key default 1 check (id = 1), tagline text, intro text, about text, about_photo text);
create table socials (id uuid primary key default gen_random_uuid(), label text not null, url text not null, sort_order int default 0);
create table messages (
  id uuid primary key default gen_random_uuid(),
  name text, email text, message text, wants_cv bool default false, cv_answers jsonb default '{}',
  status text default 'new',         -- new / approved / declined / archived
  created_at timestamptz default now());

-- ===== PIN RULES =====
-- only published projects may be pinned
create function check_pin() returns trigger language plpgsql as $$
begin
  if new.is_pinned and not exists (select 1 from projects where id = new.project_id and status = 'published')
  then raise exception 'Only published projects can be pinned'; end if;
  return new;
end $$;
create trigger t_check_pin before insert or update on project_categories for each row execute function check_pin();

-- un-publishing a project automatically removes its pin
create function clear_pin() returns trigger language plpgsql as $$
begin
  if new.status <> 'published' then update project_categories set is_pinned = false where project_id = new.id; end if;
  return new;
end $$;
create trigger t_clear_pin after update of status on projects for each row execute function clear_pin();

-- ===== SECURITY (Row Level Security) =====
do $$ declare t text; begin
  foreach t in array array['categories','folders','projects','project_categories','project_media','site_settings','socials','messages'] loop
    execute format('alter table %I enable row level security', t);
    -- the logged-in owner (the only account) can do everything
    execute format('create policy admin_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- the public can read these; drafts stay invisible
create policy pub on categories for select using (true);
create policy pub on folders for select using (true);
create policy pub on project_categories for select using (true);
create policy pub on site_settings for select using (true);
create policy pub on socials for select using (true);
create policy pub on projects for select using (status = 'published');
create policy pub on project_media for select using (exists (select 1 from projects p where p.id = project_id and p.status = 'published'));
-- the public can only DROP a message in (contact form), never read them
create policy pub_insert on messages for insert to anon with check (true);

-- ===== IMAGE STORAGE =====
insert into storage.buckets (id, name, public) values ('media', 'media', true);   -- public = anyone can view images
create policy admin_upload on storage.objects for all to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');

-- ===== STARTER DATA =====
insert into categories (name, slug, sort_order, layout) values
  ('Game Dev','game-dev',1,'standard'), ('Graphic Design','graphic-design',2,'standard'),
  ('Photography','photography',3,'standard'), ('Video Editing','video-editing',4,'standard'),
  ('Programs & Projects','programs',5,'program');

insert into site_settings (tagline, intro, about) values (
  'Hunter',
  'Game developer, designer and project coordinator from Nepal. I make games, visuals and community programs, from the first idea to the final delivery.',
  E'I''m a program and project coordination professional with an MBA in Project Management (Islington College / London Metropolitan University), plus years of hands-on creative production: branding, digital marketing, multimedia and motion graphics. I also run Rouges Games, an indie game studio where I''m the whole team.\n\nNOW\n- Youth Group Society Acting Responsible, Eurasia Reiyukai Nepal: supporting youth leadership across all 8 branches\n- Youth Coordinator, 11th Branch (Sanepa): a 12-month programme of 38+ events\n- Graphic Designer, Baba Pashupatinath Builders and Designs\n- Founder, Rouges Games\n\nEARLIER\n- Graphic Designer, Kavya Resort and Spa (2023-2024)\n- Multimedia Technician, Eurasia Reiyukai (2021-2025)\n\nEDUCATION\n- MBA, Project Management (in progress)\n- BSc (Hons) Multimedia Technology, Islington College / London Metropolitan University (2024)\n\nTRAINING\n- International Market Explanation for Developing Countries, Zhejiang (2025)\n- Graphics Designing Course, NIIT (2019)\n\nSKILLS\nMotion graphics, After Effects, Premiere Pro, Photoshop, Illustrator, 3D design, photography, branding, project and team management, strategic communication.\n\nLANGUAGES\nNepali, English');
