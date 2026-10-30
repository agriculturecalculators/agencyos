-- OPTIONAL demo data. Every record starts with "[Demo]" so it is easy to spot.
-- Run after first_admin.sql. Remove it all later with remove_demo_data.sql.
do $$
declare
  admin_id uuid := (select id from profiles where role = 'admin' order by created_at limit 1);
  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  t1 uuid;
  i1 uuid; i2 uuid; i3 uuid;
begin
  if admin_id is null then raise exception 'Create the first admin user first.'; end if;

  insert into clients (name, contact_person, email, phone, service_package, status, created_by) values
    ('[Demo] Hamdan Traders', 'Hamdan Ali', 'hamdan@example.com', '+92 300 1111111', 'SEO + Social media', 'active', admin_id) returning id into c1;
  insert into clients (name, contact_person, email, phone, service_package, status, created_by) values
    ('[Demo] Zara Fabrics', 'Zara Khan', 'zara@example.com', '+92 301 2222222', 'Facebook and Instagram ads', 'active', admin_id) returning id into c2;
  insert into clients (name, contact_person, email, phone, service_package, status, created_by) values
    ('[Demo] Al-Noor Clinic', 'Dr. Noor', 'noor@example.com', '+92 302 3333333', 'Website + local SEO', 'pending', admin_id) returning id into c3;
  insert into clients (name, contact_person, email, phone, service_package, status, created_by) values
    ('[Demo] Greenfield Agro', 'Imran Sheikh', 'greenfield@example.com', '+92 303 4444444', 'Full digital package', 'active', admin_id) returning id into c4;

  insert into projects (client_id, name, description, status, progress, budget, start_date, deadline, created_by) values
    (c1, '[Demo] Hamdan website redesign', 'New homepage and product pages', 'active', 70, 350000, current_date - 30, current_date + 10, admin_id) returning id into p1;
  insert into projects (client_id, name, description, status, progress, budget, start_date, deadline, created_by) values
    (c2, '[Demo] Eid ad campaign', 'Meta ads for the Eid collection', 'active', 45, 180000, current_date - 10, current_date + 5, admin_id) returning id into p2;
  insert into projects (client_id, name, description, status, progress, budget, start_date, deadline, created_by) values
    (c3, '[Demo] Clinic local SEO', 'Google Business profile and citations', 'pending', 10, 90000, current_date, current_date + 40, admin_id) returning id into p3;
  insert into projects (client_id, name, description, status, progress, budget, start_date, deadline, created_by) values
    (c4, '[Demo] Greenfield launch', 'Brand site and social setup', 'active', 85, 520000, current_date - 45, current_date + 1, admin_id) returning id into p4;

  insert into project_members (project_id, user_id) select p, admin_id from unnest(array[p1,p2,p3,p4]) p;
  insert into milestones (project_id, title, due_date, done) values
    (p1, 'Design approved', current_date - 12, true), (p1, 'Development complete', current_date + 3, false),
    (p4, 'Content uploaded', current_date - 2, true), (p4, 'Go live', current_date + 1, false);

  insert into tasks (project_id, title, status, priority, assignee_id, due_date, created_by) values
    (p1, '[Demo] Write 8 blog posts', 'todo', 'high', admin_id, current_date + 4, admin_id),
    (p2, '[Demo] Design Eid ad creatives', 'in_progress', 'medium', admin_id, current_date + 2, admin_id),
    (p4, '[Demo] Website speed fix', 'in_progress', 'high', admin_id, current_date + 1, admin_id),
    (p3, '[Demo] Monthly SEO report', 'todo', 'low', admin_id, current_date + 12, admin_id),
    (p1, '[Demo] Logo revision', 'done', 'low', admin_id, current_date - 5, admin_id),
    (p2, '[Demo] Facebook ads setup', 'done', 'medium', admin_id, current_date - 3, admin_id),
    (p4, '[Demo] Client review call', 'review', 'urgent', admin_id, current_date, admin_id) returning id into t1;
  insert into task_comments (task_id, author_id, body) values (t1, admin_id, 'Demo comment: client wants the call at 4 pm.');
  insert into time_entries (task_id, user_id, minutes) values (t1, admin_id, 90);

  insert into invoices (client_id, project_id, number, issue_date, due_date, total, status) values
    (c1, p1, 'DEMO-1001', current_date - 40, current_date - 25, 150000, 'paid') returning id into i1;
  insert into invoices (client_id, project_id, number, issue_date, due_date, total, status) values
    (c4, p4, 'DEMO-1002', current_date - 20, current_date + 10, 260000, 'pending') returning id into i2;
  insert into invoices (client_id, project_id, number, issue_date, due_date, total, status) values
    (c2, p2, 'DEMO-1003', current_date - 30, current_date - 5, 90000, 'pending') returning id into i3;
  insert into payments (invoice_id, client_id, amount, paid_on, method) values
    (i1, c1, 150000, current_date - 30, 'Bank transfer'), (i2, c4, 100000, current_date - 10, 'JazzCash');

  insert into expenses (title, category, amount, spent_on, project_id) values
    ('[Demo] Hosting and domains', 'Software', 18000, current_date - 20, p1),
    ('[Demo] Meta ads budget', 'Ads', 45000, current_date - 8, p2),
    ('[Demo] Office internet', 'Utilities', 9000, current_date - 3, null);

  insert into tenders (title, organization, estimated_budget, requirements, submission_deadline, status, assigned_to) values
    ('[Demo] Punjab Tourism SEO campaign', 'Punjab Tourism Dept', 2400000, 'SEO, content, monthly reporting', current_date + 12, 'preparing', admin_id),
    ('[Demo] Karachi Port brand video', 'Karachi Port Trust', 1100000, 'Two brand videos', current_date + 20, 'submitted', admin_id),
    ('[Demo] NUST social media, 6 months', 'NUST', 850000, 'Social media management', current_date - 2, 'won', admin_id),
    ('[Demo] LDA website revamp', 'LDA', 3200000, 'Full website rebuild', current_date - 14, 'lost', admin_id);

  insert into daily_reports (user_id, report_date, completed, pending, hours, status)
    values (admin_id, current_date - 1, 'Demo report: finished homepage banners, replied to client emails.', 'Ad copy review', 8, 'submitted');
  insert into notifications (user_id, title, body) values (admin_id, 'Welcome to AgencyOS', 'Demo data is loaded so you can try every screen.');
end $$;
