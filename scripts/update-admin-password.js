const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateAdminPassword() {
    const username = 'admin';
    const newPassword = 'adminpasssatoru';

    console.log(`Updating password for user: ${username}`);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user
    const { data, error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('username', username)
        .select();

    if (error) {
        console.error('Error updating password:', error.message);
    } else {
        console.log('Password updated successfully!');
        console.log('Username:', username);
        console.log('New Password:', newPassword);
    }
}

updateAdminPassword();
