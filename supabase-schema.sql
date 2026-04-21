-- ArchivalMaster — Schema SQL para Supabase
-- Pegar este SQL en el SQL Editor de tu proyecto Supabase y ejecutar

-- Extensiones
create extension if not exists "uuid-ossp";

-- Tipos ENUM
create type material_status as enum ('searching', 'screener_received', 'approved', 'order_sent', 'purchased');
create type cost_unit as enum ('per_sec', 'per_min', 'flat');
create type rights_type as enum ('free', 'licensed', 'restricted', 'unknown');
create type project_status as enum ('active', 'archived', 'completed');
create type member_role as enum ('admin', 'editor', 'viewer');
create type order_status as enum ('draft', 'sent', 'confirmed', 'paid');
create type document_type as enum ('contract', 'invoice', 'receipt', 'other');
create type edl_format as enum ('cmx3600', 'fcp_xml', 'premiere_xml', 'csv');
create type budget_status as enum ('draft', 'approved', 'sent');

-- Tabla: projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client text,
  description text,
  status project_status not null default 'active',
  created_by uuid references auth.users(id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla: project_members
create table project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role member_role not null default 'editor',
  invited_at timestamptz not null default now(),
  unique(project_id, user_id)
);

-- Tabla: providers (fuentes de material)
create table providers (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  notes text,
  created_at timestamptz not null default now()
);

-- Tabla: materials (el registro principal)
create table materials (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  provider_id uuid references providers(id) on delete set null,
  code text,
  title text not null,
  description text,
  duration_sec numeric,
  format text,
  resolution text,
  fps numeric,
  aspect_ratio text,
  timecode_in text,
  timecode_out text,
  rights_type rights_type not null default 'unknown',
  cost_amount numeric,
  cost_currency text not null default 'USD',
  cost_unit cost_unit not null default 'flat',
  link text,
  screener_url text,
  status material_status not null default 'searching',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla: material_frames (thumbnails/fotogramas)
create table material_frames (
  id uuid primary key default uuid_generate_v4(),
  material_id uuid references materials(id) on delete cascade not null,
  storage_path text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Tabla: edl_imports
create table edl_imports (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  format edl_format not null,
  raw_content text,
  imported_at timestamptz not null default now()
);

-- Tabla: edl_clips (clips individuales de un EDL)
create table edl_clips (
  id uuid primary key default uuid_generate_v4(),
  edl_import_id uuid references edl_imports(id) on delete cascade not null,
  material_id uuid references materials(id) on delete set null,
  clip_name text not null,
  reel text,
  record_in text not null,
  record_out text not null,
  source_in text,
  source_out text,
  duration_sec numeric not null default 0
);

-- Tabla: budgets
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  edl_import_id uuid references edl_imports(id) on delete set null,
  name text not null,
  total_amount numeric not null default 0,
  currency text not null default 'USD',
  status budget_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- Tabla: budget_items
create table budget_items (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade not null,
  material_id uuid references materials(id) on delete cascade not null,
  edl_clip_id uuid references edl_clips(id) on delete set null,
  duration_sec numeric,
  unit_cost numeric not null default 0,
  total numeric not null default 0
);

-- Tabla: orders (pedidos formales por proveedor)
create table orders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  provider_id uuid references providers(id) on delete cascade not null,
  budget_id uuid references budgets(id) on delete set null,
  status order_status not null default 'draft',
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- Tabla: order_items
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade not null,
  material_id uuid references materials(id) on delete cascade not null,
  edl_clip_id uuid references edl_clips(id) on delete set null,
  duration_sec numeric,
  cost numeric not null default 0
);

-- Tabla: documents (contratos, facturas, recibos)
create table documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  order_id uuid references orders(id) on delete set null,
  type document_type not null default 'other',
  filename text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  notes text
);

-- Índices para performance
create index on materials(project_id);
create index on materials(provider_id);
create index on materials(status);
create index on providers(project_id);
create index on edl_clips(edl_import_id);
create index on edl_clips(material_id);
create index on budget_items(budget_id);
create index on order_items(order_id);
create index on documents(project_id);
create index on documents(order_id);
create index on project_members(project_id);
create index on project_members(user_id);

-- Trigger: updated_at automático
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger materials_updated_at before update on materials
  for each row execute function update_updated_at();

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();

-- Auto-agregar creador como admin del proyecto
create or replace function add_creator_as_admin()
returns trigger as $$
begin
  insert into project_members(project_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$ language plpgsql security definer;

create trigger project_creator_admin after insert on projects
  for each row execute function add_creator_as_admin();

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================

alter table projects enable row level security;
alter table project_members enable row level security;
alter table providers enable row level security;
alter table materials enable row level security;
alter table material_frames enable row level security;
alter table edl_imports enable row level security;
alter table edl_clips enable row level security;
alter table budgets enable row level security;
alter table budget_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table documents enable row level security;

-- Helper: verifica si el usuario tiene acceso al proyecto
create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function has_project_role(p_project_id uuid, p_roles member_role[])
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid() and role = any(p_roles)
  );
$$ language sql security definer stable;

-- Policies: projects
create policy "members can view projects" on projects
  for select using (has_project_access(id));

create policy "authenticated users can create projects" on projects
  for insert with check (auth.uid() = created_by);

create policy "admins can update projects" on projects
  for update using (has_project_role(id, array['admin']::member_role[]));

-- Policies: project_members
create policy "members can view project_members" on project_members
  for select using (has_project_access(project_id));

create policy "admins can manage project_members" on project_members
  for all using (has_project_role(project_id, array['admin']::member_role[]));

-- Policies: providers, materials, etc. — acceso por pertenencia al proyecto
create policy "project access for providers" on providers
  for all using (has_project_access(project_id));

create policy "project access for materials" on materials
  for all using (has_project_access(project_id));

create policy "project access for material_frames" on material_frames
  for all using (
    exists (select 1 from materials m where m.id = material_id and has_project_access(m.project_id))
  );

create policy "project access for edl_imports" on edl_imports
  for all using (has_project_access(project_id));

create policy "project access for edl_clips" on edl_clips
  for all using (
    exists (select 1 from edl_imports e where e.id = edl_import_id and has_project_access(e.project_id))
  );

create policy "project access for budgets" on budgets
  for all using (has_project_access(project_id));

create policy "project access for budget_items" on budget_items
  for all using (
    exists (select 1 from budgets b where b.id = budget_id and has_project_access(b.project_id))
  );

create policy "project access for orders" on orders
  for all using (has_project_access(project_id));

create policy "project access for order_items" on order_items
  for all using (
    exists (select 1 from orders o where o.id = order_id and has_project_access(o.project_id))
  );

create policy "project access for documents" on documents
  for all using (has_project_access(project_id));

-- Storage buckets (ejecutar por separado en Supabase Storage)
-- insert into storage.buckets (id, name, public) values ('frames', 'frames', true);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
