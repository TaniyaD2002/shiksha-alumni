-- Sample headshots for the three seeded alumni.
--
-- The app falls back to a picked-from-a-shortlist portrait for any alum with no
-- photo_url, but pinning these means the demo profiles look the same for
-- everyone. Replace the URLs with real photos whenever you have them.

update public.alumni set photo_url = 'https://i.pravatar.cc/600?img=16'
  where name = 'Aisha Khan';

update public.alumni set photo_url = 'https://i.pravatar.cc/600?img=12'
  where name = 'Rahul Menon';

update public.alumni set photo_url = 'https://i.pravatar.cc/600?img=26'
  where name = 'Sara Ahmed';
