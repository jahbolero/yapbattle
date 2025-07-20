import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

async function setupDatabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Read the schema file
    const schema = readFileSync('./database/schema.sql', 'utf8');
    
    console.log('Setting up database tables...');
    
    // Execute the schema
    const { error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      console.error('Error setting up database:', error);
    } else {
      console.log('Database setup completed successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

setupDatabase(); 