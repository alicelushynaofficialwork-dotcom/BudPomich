CREATE OR REPLACE FUNCTION public.confirm_request_period(
  request_id uuid,
  selected_period jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_rows integer;
BEGIN
  IF auth.uid() IS NULL
     OR jsonb_typeof(selected_period) <> 'object'
     OR nullif(selected_period ->> 'dateFrom', '') IS NULL
     OR nullif(selected_period ->> 'dateTo', '') IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.requests AS request
  SET
    confirmed_period = selected_period,
    status = 'accepted',
    is_read = true,
    updated_at = now()
  WHERE request.id = request_id
    AND request.client_id = auth.uid()
    AND request.status IN ('new', 'accepted')
    AND coalesce(request.periods, '[]'::jsonb) @> jsonb_build_array(selected_period);

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_request_period(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_request_period(uuid, jsonb) TO authenticated;
