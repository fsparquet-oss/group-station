import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ccpckfbfzoxtycmfhwtr.supabase.co'
const SUPABASE_KEY = 'sb_publishable_kRGdpisAOrEBfQATnx1lMw_kv3a6vcI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
