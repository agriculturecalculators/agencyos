-- Removes everything created by demo_data.sql.
delete from tenders where title like '[Demo]%';
delete from expenses where title like '[Demo]%';
delete from invoices where number like 'DEMO-%';
delete from projects where name like '[Demo]%';
delete from clients where name like '[Demo]%';
delete from tasks where title like '[Demo]%';
delete from daily_reports where completed like 'Demo report:%';
delete from notifications where title = 'Welcome to AgencyOS';
