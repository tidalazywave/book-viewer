const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixMigration() {
    console.log('Starting migration fix...');

    // Read books.json
    const booksFilePath = path.resolve(__dirname, '../src/data/books.json');
    const booksData = fs.readFileSync(booksFilePath, 'utf8');
    const books = JSON.parse(booksData);

    console.log(`Found ${books.length} books in books.json`);

    for (const book of books) {
        console.log(`Updating "${book.title}"...`);

        // Correct property names: coverImage -> cover_url, pdfPath -> file_url
        const { error } = await supabase
            .from('books')
            .update({
                cover_url: book.coverImage,
                file_url: book.pdfPath,
                file_type: book.fileType || 'pdf',
                description: book.description,
                author: book.author,
                level: book.level
            })
            .eq('title', book.title);

        if (error) {
            console.error(`Error updating "${book.title}":`, error.message);
        } else {
            console.log(`Mapped coverImage -> cover_url: ${book.coverImage}`);
        }
    }

    console.log('Fix completed!');
}

fixMigration();
