
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqfdhtciazggawaayrxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZmRodGNpYXpnZ2F3YWF5cnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNjg1MTQsImV4cCI6MjA4MTk0NDUxNH0.5G3GwXVXnpNvqXVc5Yyyi2sF9hwHbVQxbNqZQM_r5O4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
