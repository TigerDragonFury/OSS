-- Historical Expenses Import (Before System)
-- Data from Book11.xlsx
-- These expenses were paid personally by partners

-- First, look up owner IDs by name
DO $$
DECLARE
    ali_id UUID;
    majed_id UUID;
    new_expense_id UUID;
BEGIN
    SELECT id INTO ali_id FROM owners WHERE name ILIKE '%Ali%Al Dalou%' LIMIT 1;
    SELECT id INTO majed_id FROM owners WHERE name ILIKE '%Majed%' LIMIT 1;

    IF ali_id IS NULL OR majed_id IS NULL THEN
        RAISE EXCEPTION 'Could not find owner IDs. Ali: %, Majed: %', ali_id, majed_id;
    END IF;

    -- ============================================================
    -- INSERT INTO expenses TABLE
    -- ============================================================

    -- 1. Vessel Class Assessment For Regina 250 and Valentine 3
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Vessel Class Assessment For Regina 250 and Valentine 3', 'Other Expenses', 11760, '2025-05-19', 'Vessel Class Assessment For Regina 250 and Valentine 3', majed_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (majed_id, '2025-05-19', 11760, 'expense_payment', new_expense_id, 'Vessel Class Assessment For Regina 250 and Valentine 3', 'personal_savings');

    -- 2. Parking
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Parking', 'Rent & Lease', 40000, '2025-05-23', 'Parking', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 40000, 'expense_payment', new_expense_id, 'Parking', 'personal_savings');

    -- 3. Khalifa
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Khalifa', 'Salaries & Wages', 150000, '2025-05-23', 'Khalifa', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 150000, 'expense_payment', new_expense_id, 'Khalifa', 'personal_savings');

    -- 4. Parking
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Parking', 'Rent & Lease', 35000, '2025-05-23', 'Parking', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 35000, 'expense_payment', new_expense_id, 'Parking', 'personal_savings');

    -- 5. Guarding the Vessels
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Guarding the Vessels', 'Uncategorized', 18000, '2025-05-23', 'Guarding the Vessels', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 18000, 'expense_payment', new_expense_id, 'Guarding the Vessels', 'personal_savings');

    -- 6. Crane Repair
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Crane Repair', 'Fuel & Vehicle Maintenance', 11500, '2025-05-23', 'Crane Repair', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 11500, 'expense_payment', new_expense_id, 'Crane Repair', 'personal_savings');

    -- 7. Crane 700 Ton
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Crane 700 Ton', 'Fuel & Vehicle Maintenance', 32000, '2025-05-23', 'Crane 700 Ton', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 32000, 'expense_payment', new_expense_id, 'Crane 700 Ton', 'personal_savings');

    -- 8. Murad
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Murad', 'Salaries & Wages', 2000, '2025-05-23', 'Murad', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 2000, 'expense_payment', new_expense_id, 'Murad', 'personal_savings');

    -- 9. Batteries + Generator
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Batteries + Generator', 'Fuel & Vehicle Maintenance', 11000, '2025-05-23', 'Batteries + Generator', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 11000, 'expense_payment', new_expense_id, 'Batteries + Generator', 'personal_savings');

    -- 10. Crane Operation
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Crane Operation', 'Uncategorized', 11500, '2025-05-23', 'Crane Operation', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 11500, 'expense_payment', new_expense_id, 'Crane Operation', 'personal_savings');

    -- 11. Ahmad Saeed
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Ahmad Saeed', 'Salaries & Wages', 10000, '2025-05-23', 'Ahmad Saeed', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 10000, 'expense_payment', new_expense_id, 'Ahmad Saeed', 'personal_savings');

    -- 12. Saeed
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Saeed', 'Uncategorized', 30000, '2025-05-23', 'Saeed', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 30000, 'expense_payment', new_expense_id, 'Saeed', 'personal_savings');

    -- 13. General Expenses
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('General Expenses', 'Other Expenses', 10000, '2025-05-23', 'General Expenses', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 10000, 'expense_payment', new_expense_id, 'General Expenses', 'personal_savings');

    -- 14. Parking
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Parking', 'Other Expenses', 115000, '2025-05-23', 'Parking', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 115000, 'expense_payment', new_expense_id, 'Parking', 'personal_savings');

    -- 15. Halawa
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Halawa', 'Other Expenses', 2000, '2025-05-23', 'Halawa', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 2000, 'expense_payment', new_expense_id, 'Halawa', 'personal_savings');

    -- 16. Murad Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Murad Salary', 'Salaries & Wages', 6500, '2025-05-23', 'Murad Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 6500, 'expense_payment', new_expense_id, 'Murad Salary', 'personal_savings');

    -- 17. Hameed
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Hameed', 'Salaries & Wages', 67000, '2025-05-23', 'Hameed', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-23', 67000, 'expense_payment', new_expense_id, 'Hameed', 'personal_savings');

    -- 18. Murad Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Murad Salary', 'Salaries & Wages', 7500, '2025-05-30', 'Murad Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-30', 7500, 'expense_payment', new_expense_id, 'Murad Salary', 'personal_savings');

    -- 19. Trailers+ForkLift
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Trailers+ForkLift', 'Other Expenses', 106985, '2025-05-30', 'Trailers+ForkLift', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-30', 106985, 'expense_payment', new_expense_id, 'Trailers+ForkLift', 'personal_savings');

    -- 20. Mahmoud
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Mahmoud', 'Salaries & Wages', 6000, '2025-05-30', 'Mahmoud', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-30', 6000, 'expense_payment', new_expense_id, 'Mahmoud', 'personal_savings');

    -- 21. Mohamad Staiti
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Mohamad Staiti', 'Salaries & Wages', 13500, '2025-05-30', 'Mohamad Staiti', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-30', 13500, 'expense_payment', new_expense_id, 'Mohamad Staiti', 'personal_savings');

    -- 22. Hani Al Dalou Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Hani Al Dalou Salary', 'Salaries & Wages', 4500, '2025-05-30', 'Hani Al Dalou Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-30', 4500, 'expense_payment', new_expense_id, 'Hani Al Dalou Salary', 'personal_savings');

    -- 23. Saeedi Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Saeedi Salary', 'Salaries & Wages', 15000, '2025-05-30', 'Saeedi Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-05-30', 15000, 'expense_payment', new_expense_id, 'Saeedi Salary', 'personal_savings');

    -- 24. Hameed
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Hameed', 'Salaries & Wages', 8000, '2025-06-04', 'Hameed', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-06-04', 8000, 'expense_payment', new_expense_id, 'Hameed', 'personal_savings');

    -- 25. Sheebo Diesel
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Sheebo Diesel', 'Fuel & Vehicle Maintenance', 15500, '2025-06-04', 'Sheebo Diesel', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-06-04', 15500, 'expense_payment', new_expense_id, 'Sheebo Diesel', 'personal_savings');

    -- 26. Wages for Employees
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Wages for Employees', 'Salaries & Wages', 4000, '2025-06-04', 'Wages for Employees', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-06-04', 4000, 'expense_payment', new_expense_id, 'Wages for Employees', 'personal_savings');

    -- 27. Hameed Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Hameed Salary', 'Salaries & Wages', 7000, '2025-06-10', 'Hameed Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-06-10', 7000, 'expense_payment', new_expense_id, 'Hameed Salary', 'personal_savings');

    -- 28. Hameed (Salary)
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Hameed', 'Salaries & Wages', 10000, '2025-08-13', 'Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-08-13', 10000, 'expense_payment', new_expense_id, 'Hameed - Salary', 'personal_savings');

    -- 29. Murad Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Murad Salary', 'Salaries & Wages', 7500, '2025-08-13', 'Murad Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-08-13', 7500, 'expense_payment', new_expense_id, 'Murad Salary', 'personal_savings');

    -- 30. Jac Maritime
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Jac Maritime', 'Rent & Lease', 23136.75, '2025-08-13', 'Jac Maritime', majed_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (majed_id, '2025-08-13', 23136.75, 'expense_payment', new_expense_id, 'Jac Maritime', 'personal_savings');

    -- 31. ABL Group
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('ABL Group', 'Rent & Lease', 9740.24, '2025-08-13', 'Regina and Maridive 42 Towage Inspection', majed_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (majed_id, '2025-08-13', 9740.24, 'expense_payment', new_expense_id, 'ABL Group - Regina and Maridive 42 Towage Inspection', 'personal_savings');

    -- 32. Khalifa CREW
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Khalifa CREW', 'Repairs & Maintenance (Equipment)', 8000, '2025-08-13', 'Khalifa CREW', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-08-13', 8000, 'expense_payment', new_expense_id, 'Khalifa CREW', 'personal_savings');

    -- 33. Khalifa Hydraulic Head Cover
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Khalifa Hydraulic Head Cover', 'Repairs & Maintenance (Equipment)', 3500, '2025-10-04', 'Khalifa Hydraulic Head Cover', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 3500, 'expense_payment', new_expense_id, 'Khalifa Hydraulic Head Cover', 'personal_savings');

    -- 34. Khalifa Starter Dynamo
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Khalifa Starter Dynamo', 'Repairs & Maintenance (Equipment)', 1290, '2025-10-04', 'Khalifa Starter Dynamo', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 1290, 'expense_payment', new_expense_id, 'Khalifa Starter Dynamo', 'personal_savings');

    -- 35. Khalifa Starter Dynamo (second)
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Khalifa Starter Dynamo', 'Repairs & Maintenance (Equipment)', 1800, '2025-10-04', 'Khalifa Starter Dynamo (2nd purchase)', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 1800, 'expense_payment', new_expense_id, 'Khalifa Starter Dynamo (2nd purchase)', 'personal_savings');

    -- 36. Diesel
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Diesel', 'Repairs & Maintenance (Equipment)', 2500, '2025-10-04', 'Diesel', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 2500, 'expense_payment', new_expense_id, 'Diesel', 'personal_savings');

    -- 37. Batteries + Generator
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Batteries + Generator', 'Repairs & Maintenance (Equipment)', 2400, '2025-10-04', 'Batteries + Generator', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 2400, 'expense_payment', new_expense_id, 'Batteries + Generator', 'personal_savings');

    -- 38. Generator
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Generator', 'Repairs & Maintenance (Equipment)', 8000, '2025-10-04', 'Generator', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 8000, 'expense_payment', new_expense_id, 'Generator', 'personal_savings');

    -- 39. Nylon
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Nylon', 'Repairs & Maintenance (Equipment)', 500, '2025-10-04', 'Nylon', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 500, 'expense_payment', new_expense_id, 'Nylon', 'personal_savings');

    -- 40. Faya Storage
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Faya Storage', 'Rent & Lease', 10000, '2025-10-04', 'Faya Storage', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 10000, 'expense_payment', new_expense_id, 'Faya Storage', 'personal_savings');

    -- 41. Faya Moving of Anchors
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Faya Moving of Anchors', 'Other Expenses', 25000, '2025-10-04', 'Faya Moving of Anchors', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 25000, 'expense_payment', new_expense_id, 'Faya Moving of Anchors', 'personal_savings');

    -- 42. Shakoor
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Shakoor', 'Salaries & Wages', 22500, '2025-10-04', 'Shakoor', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 22500, 'expense_payment', new_expense_id, 'Shakoor', 'personal_savings');

    -- 43. Hameed Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Hameed Salary', 'Salaries & Wages', 86000, '2025-10-04', 'Hameed Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 86000, 'expense_payment', new_expense_id, 'Hameed Salary', 'personal_savings');

    -- 44. Starter Motor Caterpillar 24V
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Starter Motor Caterpillar 24V', 'Repairs & Maintenance (Equipment)', 1575, '2025-10-04', 'Starter Motor Caterpillar 24V', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 1575, 'expense_payment', new_expense_id, 'Starter Motor Caterpillar 24V', 'personal_savings');

    -- 45. Tareq Advance Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Tareq Advance Salary', 'Salaries & Wages', 15000, '2025-10-04', 'Tareq Advance Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 15000, 'expense_payment', new_expense_id, 'Tareq Advance Salary', 'personal_savings');

    -- 46. Crane used to move AR Winch
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Crane used to move AR Winch', 'Other Expenses', 31000, '2025-10-04', 'Crane used to move AR Winch', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 31000, 'expense_payment', new_expense_id, 'Crane used to move AR Winch', 'personal_savings');

    -- 47. Abu Abdallah
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Abu Abdallah', 'Salaries & Wages', 9000, '2025-10-04', 'Abu Abdallah', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 9000, 'expense_payment', new_expense_id, 'Abu Abdallah', 'personal_savings');

    -- 48. Cutting Cost for Regina 250
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Cutting Cost for Regina 250', 'Other Expenses', 45000, '2025-10-04', 'Cutting Cost for Regina 250', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 45000, 'expense_payment', new_expense_id, 'Cutting Cost for Regina 250', 'personal_savings');

    -- 49. Marwan Loan
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Marwan Loan', 'Other Expenses', 5000, '2025-10-04', 'Marwan Loan', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 5000, 'expense_payment', new_expense_id, 'Marwan Loan', 'personal_savings');

    -- 50. Metal Repair
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Metal Repair', 'Other Expenses', 2000, '2025-10-04', 'Metal Repair', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-04', 2000, 'expense_payment', new_expense_id, 'Metal Repair', 'personal_savings');

    -- 51. Beju and workers
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Beju and workers', 'Salaries & Wages', 10000, '2025-10-10', 'Beju and workers', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-10', 10000, 'expense_payment', new_expense_id, 'Beju and workers', 'personal_savings');

    -- 52. Hafara
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Hafara', 'Other Expenses', 4800, '2025-10-10', 'Hafara', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-10', 4800, 'expense_payment', new_expense_id, 'Hafara', 'personal_savings');

    -- 53. Steel Cutting Oxygen
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Steel Cutting Oxygen', 'Other Expenses', 48000, '2025-10-10', 'Steel Cutting Oxygen', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-10', 48000, 'expense_payment', new_expense_id, 'Steel Cutting Oxygen', 'personal_savings');

    -- 54. Escavator + Lobid
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Escavator + Lobid', 'Other Expenses', 8400, '2025-10-23', 'Escavator + Lobid', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-23', 8400, 'expense_payment', new_expense_id, 'Escavator + Lobid', 'personal_savings');

    -- 55. Khalifa Documents Stinger
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Khalifa Documents Stinger', 'Other Expenses', 5000, '2025-10-23', 'Khalifa Documents Stinger', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-23', 5000, 'expense_payment', new_expense_id, 'Khalifa Documents Stinger', 'personal_savings');

    -- 56. License Renewel
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('License Renewel', 'Other Expenses', 4100, '2025-10-23', 'License Renewel', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-10-23', 4100, 'expense_payment', new_expense_id, 'License Renewel', 'personal_savings');

    -- 57. Workers
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Workers', 'Salaries & Wages', 22500, '2025-11-01', 'Workers', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-11-01', 22500, 'expense_payment', new_expense_id, 'Workers', 'personal_savings');

    -- 58. Regina Expenses
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Regina Expenses', 'Other Expenses', 16100, '2025-11-01', 'Cutting, Water, Diesel, Mahmoud, Worker from outside', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-11-01', 16100, 'expense_payment', new_expense_id, 'Regina Expenses - Cutting, Water, Diesel, Mahmoud, Worker from outside', 'personal_savings');

    -- 59. Saeedi Salary and Leave
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Saeedi Salary and Leave', 'Salaries & Wages', 15000, '2025-11-01', 'Saeedi Salary and Leave', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-11-01', 15000, 'expense_payment', new_expense_id, 'Saeedi Salary and Leave', 'personal_savings');

    -- 60. Forklifts from July until Nov 1
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Forklifts from July until Nov 1', 'Rent & Lease', 34900, '2025-11-01', 'Forklifts from July until Nov 1', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-11-01', 34900, 'expense_payment', new_expense_id, 'Forklifts from July until Nov 1', 'personal_savings');

    -- 61. Khalifa
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Khalifa', 'Salaries & Wages', 60000, '2025-11-12', 'Khalifa', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-11-12', 60000, 'expense_payment', new_expense_id, 'Khalifa', 'personal_savings');

    -- 62. Diesel Bill
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Diesel Bill', 'Uncategorized', 25000, '2025-11-12', 'Diesel Bill', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-11-12', 25000, 'expense_payment', new_expense_id, 'Diesel Bill', 'personal_savings');

    -- 63. Tareq Salary
    INSERT INTO expenses (expense_type, category, amount, date, description, paid_by_owner_id, status)
    VALUES ('Tareq Salary', 'Salaries & Wages', 3500, '2025-11-12', 'Tareq Salary', ali_id, 'paid')
    RETURNING id INTO new_expense_id;
    INSERT INTO informal_contributions (owner_id, contribution_date, amount, transaction_type, transaction_id, description, source_of_funds)
    VALUES (ali_id, '2025-11-12', 3500, 'expense_payment', new_expense_id, 'Tareq Salary', 'personal_savings');

    RAISE NOTICE 'Successfully imported 63 historical expenses. Total: 1,488,162.99 AED';
    RAISE NOTICE 'Ali Al Dalou paid: 1,443,525.00 AED (60 expenses)';
    RAISE NOTICE 'Majed Abou Chaker paid: 44,636.99 AED (3 expenses)';
END $$;
