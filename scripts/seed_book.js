const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedBook() {
    const { data, error } = await supabase
        .from('books')
        .insert([
            {
                title: 'Test Book for CRUD',
                author: 'Tester',
                level: 1,
                description: 'This is a test book.',
                file_type: 'text',
                file_url: 'https://placehold.co/600x400', // Dummy URL
                cover_url: 'https://placehold.co/400x600'  // Dummy URL
            }
        ])
        .select();

    if (error) {
        console.error('Error inserting book:', error);
    } else {
        console.log('Book inserted:', data);
    }
}

seedBook();
