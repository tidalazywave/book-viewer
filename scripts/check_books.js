const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooks() {
    const { data, error } = await supabase
        .from('books')
        .select('id, title, file_type');

    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

checkBooks();
