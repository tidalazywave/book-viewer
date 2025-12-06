const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAdminPassword() {
    const username = 'admin';
    const newPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    console.log(`Resetting password for user: ${username}...`);

    // Update
    const { data, error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('username', username)
        .select();

    if (error) {
        console.error('Error updating password:', error);
    } else if (data.length === 0) {
        // If not exists, create it
        console.log('User not found, creating new admin user...');
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
                {
                    username: username,
                    password_hash: passwordHash,
                    name: 'Administrator',
                    role: 'admin'
                }
            ])
            .select();

        if (createError) {
            console.error('Error creating user:', createError);
        } else {
            console.log('Admin user created successfully:', newUser);
        }
    } else {
        console.log('Password updated successfully:', data);
    }
}

resetAdminPassword();
