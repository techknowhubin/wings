-- Assign all unassigned cab bookings to the first available Hub Partner
UPDATE public.cab_bookings
SET hub_partner_id = (SELECT id FROM public.profiles WHERE role = 'hub_partner' LIMIT 1),
    assignment_status = 'Assigned'
WHERE hub_partner_id IS NULL;

-- This will trigger the trigger we created earlier, which populates assigned_hub_uuid!
