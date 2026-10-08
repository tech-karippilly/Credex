create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.site_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.services (
  id text primary key,
  title text not null,
  short text not null default '',
  description text not null default '',
  icon text not null default 'Code2',
  image_url text,
  capabilities text[] not null default '{}',
  benefits text[] not null default '{}',
  sort int not null default 0,
  published boolean not null default true
);
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public read" on public.services for select to anon, authenticated using (published or public.has_role(auth.uid(),'admin'));
create policy "services admin write" on public.services for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null default '',
  employment text not null default '',
  experience text not null default '',
  workplace text not null default '',
  salary text not null default '',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  good_to_have text not null default '',
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "jobs public read" on public.jobs for select to anon, authenticated using (published or public.has_role(auth.uid(),'admin'));
create policy "jobs admin write" on public.jobs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_title text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  experience text not null,
  location text not null,
  message text,
  resume_path text,
  created_at timestamptz not null default now()
);
grant insert on public.job_applications to anon, authenticated;
grant select, delete on public.job_applications to authenticated;
grant all on public.job_applications to service_role;
alter table public.job_applications enable row level security;
create policy "anyone can apply" on public.job_applications for insert to anon, authenticated with check (true);
create policy "admin reads applications" on public.job_applications for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin deletes applications" on public.job_applications for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  phone text not null,
  service text not null,
  message text not null,
  created_at timestamptz not null default now()
);
grant insert on public.enquiries to anon, authenticated;
grant select, delete on public.enquiries to authenticated;
grant all on public.enquiries to service_role;
alter table public.enquiries enable row level security;
create policy "anyone can enquire" on public.enquiries for insert to anon, authenticated with check (true);
create policy "admin reads enquiries" on public.enquiries for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin deletes enquiries" on public.enquiries for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "media admin read" on storage.objects for select to authenticated using (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));
create policy "media admin write" on storage.objects for insert to authenticated with check (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));
create policy "resume upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'resumes');
create policy "resume admin read" on storage.objects for select to authenticated using (bucket_id = 'resumes' and public.has_role(auth.uid(),'admin'));

insert into public.site_settings (id, data) values (1, '{"email":"hr@credexfin.com","phone":"+91 80785 99537","location":"Irinjalakuda, Kerala, India","linkedin":"","instagram":"","hero_title":"Technology That Solves Real Business Problems.","hero_text":"Credex builds practical, scalable technology solutions that help businesses simplify operations, automate processes, improve efficiency, and create real business value.","hero_image":"","about_image":""}');

insert into public.services (id,title,short,description,icon,capabilities,benefits,sort) values
('custom-software','Custom Software Development','Tailored software solutions designed around your business processes, requirements and goals.','Every business works differently. We design and develop software around the way your teams actually operate — so the technology supports your processes instead of forcing workarounds.','Code2','{"Requirement discovery and solution design","Custom business applications","Internal tools and portals","Integration with existing systems","Ongoing maintenance and enhancements"}','{"Software that fits your processes","Less reliance on manual workarounds","Full ownership of your solution","Room to grow as your business changes"}',1),
('saas','SaaS Solutions','Scalable software platforms designed to support modern businesses and evolving customer needs.','We build cloud-based software platforms that are designed to scale with your users, support multiple customers and evolve with changing market needs.','Layers','{"SaaS product planning","Multi-user and multi-tenant platforms","Subscription and account management","Admin dashboards and reporting","Continuous product improvement"}','{"Reach customers anywhere","Predictable, scalable growth","Faster delivery of new features","A platform built for the long term"}',2),
('web-apps','Web & Digital Applications','Modern, responsive web applications that deliver practical and engaging digital experiences.','From customer-facing portals to internal business applications, we create responsive web experiences that are fast, clear and easy to use on any device.','MonitorSmartphone','{"Responsive web applications","Customer and partner portals","Business websites","User experience and interface design","Performance and accessibility"}','{"Consistent experience on every device","Easier customer engagement","Professional digital presence","Lower friction for users"}',3),
('automation','Business Automation','Automate repetitive processes, reduce manual work and improve operational efficiency.','We identify repetitive, time-consuming tasks and replace them with reliable automated workflows — freeing your team to focus on work that matters.','Workflow','{"Process analysis and mapping","Workflow automation","Approvals and notifications","Document and data handling","System-to-system integrations"}','{"Less manual effort","Fewer errors and delays","Faster turnaround times","Better visibility into operations"}',4),
('data','Data & Technology Solutions','Use data and technology more effectively to support better decisions and business operations.','We help you organise, connect and present your business data so that the right information is available to the right people when decisions are made.','Database','{"Data organisation and structuring","Dashboards and reporting","Data integration across systems","Business insights tooling","Data quality improvement"}','{"Clearer view of performance","Decisions based on reliable information","Less time spent compiling reports","Connected business information"}',5),
('transformation','Digital Transformation','Modernize business processes with practical digital solutions that help organizations adapt and grow.','We work with organisations to move from paper, spreadsheets and disconnected tools to practical digital processes — step by step, with minimal disruption.','RefreshCcw','{"Current-state assessment","Digital roadmap planning","Process digitisation","Legacy system modernisation","Adoption and change support"}','{"Modern, efficient operations","A clear path forward","Improved customer experience","Stronger readiness for growth"}',6),
('consulting','IT Consulting & Technical Services','Technology guidance and technical expertise to help businesses make better technology decisions.','Choosing the right technology is a business decision. We offer honest, practical guidance to help you plan, evaluate and implement technology with confidence.','Compass','{"Technology advisory","Solution architecture","Technology evaluation","Technical documentation","Ongoing technical support"}','{"Confident technology decisions","Reduced risk on investments","Alignment between business and technology","Access to technical expertise"}',7);

insert into public.jobs (title,location,employment,experience,workplace,salary,responsibilities,requirements,good_to_have,sort) values
('Business & Sales Marketing Executive','Irinjalakuda, Kerala','Full-time','1–3 years','On-site','₹2.4–3.6 LPA',
'{"Generate and qualify new business leads","Identify and approach potential clients","Build and maintain strong client relationships","Conduct sales calls, emails and LinkedIn outreach","Understand client requirements and present suitable solutions","Arrange product demonstrations and client meetings","Follow up with prospects and support lead conversion","Research market opportunities and competitors","Maintain lead and customer records","Coordinate with technical and product teams"}',
'{"1–3 years of experience in Sales, Business Development or Marketing","Strong communication and interpersonal skills","Good presentation and negotiation skills","Lead generation and follow-up experience","Confident in client communication","Self-motivated and target-oriented"}',
'Experience in SaaS, Software, Fintech, NBFC, Banking or B2B Technology.',1);