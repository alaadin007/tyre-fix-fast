UPDATE public.customers
SET full_name = NULL
WHERE full_name IS NOT NULL
  AND (
    length(trim(full_name)) < 3
    OR lower(trim(full_name)) IN (
      'hey','hi','hello','hiya','yo','sup','help','urgent','please','pls','thanks','thank you',
      'ok','okay','yes','no','yeah','yep','nope','sure','mate','sir','madam','customer',
      'hii','hiii','heyy','heyyy','hola','hai','good','morning','evening','afternoon','night',
      'tyre','tire','tyres','tires','wheel','flat','puncture','car','emergency'
    )
  );