-- WriteLite admin control centre v2 helper permission patch
-- Allows moderation-aware RLS policies to evaluate the admin helper for public
-- and signed-in requests. The helper itself only returns whether the supplied
-- authenticated user ID belongs to an admin profile.

grant execute on function public.is_admin_v2(uuid) to anon, authenticated;
