-- Run AFTER you create the first user in Supabase > Authentication > Users > Add user
-- (email: agriculturecalculators@gmail.com, tick "Auto Confirm User").
-- That first account is made Admin automatically. This sets the login username.
update profiles
set full_name = 'Abu Bakar Altaf', username = 'Abu Bakar Altaf'
where email = 'agriculturecalculators@gmail.com';

select id, full_name, username, role from profiles;
