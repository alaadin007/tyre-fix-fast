UPDATE app_settings
SET value = jsonb_set(
  value,
  '{prompt}',
  to_jsonb(
    replace(
      value->>'prompt',
      'Detect change_request when the customer wants to update something already captured.

HARD RULES',
      'Detect change_request when the customer wants to update something already captured.

LOCATION RULES
- The customer can share location in TWO ways:
  1. WhatsApp live location pin (preferred)
  2. Typed street address with postcode (accepted if the pin isn''t working)
- If the customer types a full street address because the pin isn''t working, do NOT tell them to send a pin. Accept the address as valid location input.
- If the customer asks whether they can type their address instead of a pin, say yes — a full street address with postcode is perfectly fine.

HARD RULES'
    )
  )
)
WHERE key = 'whatsapp_system_prompt';