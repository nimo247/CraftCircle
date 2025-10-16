import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gyrqsogkcpmzdgpwafva.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnFzb2drY3BtemRncHdhZnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDI5MTIsImV4cCI6MjA3NTY3ODkxMn0.FC0SAFcNQg324MFZXtshEgI8OZy75RcbusFKEtVyewk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
