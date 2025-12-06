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

async function migrateBooks() {
    console.log('Starting migration...');

    // Read books.json
    const booksFilePath = path.resolve(__dirname, '../src/data/books.json');
    const booksData = fs.readFileSync(booksFilePath, 'utf8');
    const books = JSON.parse(booksData);

    console.log(`Found ${books.length} books in books.json`);

    for (const book of books) {
        // Check if book already exists (by title)
        const { data: existing } = await supabase
            .from('books')
            .select('id')
            .eq('title', book.title)
            .single();

        if (existing) {
            console.log(`Skipping "${book.title}" (already exists)`);
            continue;
        }

        // Insert book
        // Note: We map the JSON fields to DB columns. 
        // JSON: id, title, author, level, coverUrl, fileUrl, description, fileType
        // DB: title, author, level, description, cover_url, file_url, file_type
        const { error } = await supabase.from('books').insert([
            {
                title: book.title,
                author: book.author,
                level: book.level,
                description: book.description,
                cover_url: book.coverUrl, // CamelCase to snake_case
                file_url: book.fileUrl,   // CamelCase to snake_case
                file_type: book.fileType || 'pdf',
            },
        ]);

        if (error) {
            console.error(`Error inserting "${book.title}":`, error.message);
        } else {
            console.log(`Inserted "${book.title}"`);
        }
    }

    console.log('Migration completed!');
}

migrateBooks();
