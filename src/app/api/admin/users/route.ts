import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
    try {
        // 1. 認証チェック (管理者のみ許可)
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 401 }
            );
        }

        // 2. ユーザー一覧取得 (パスワードハッシュは除外すべきだが、今回はシンプルに取得してクライアントに返さない方針でも可。安全のため除外推奨)
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, name, role, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json(users);

    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // 1. 認証チェック (管理者のみ許可)
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { username, password, name, role } = body;

        // 2. バリデーション
        if (!username || !password || !name || !role) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 3. パスワードハッシュ化
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. ユーザー作成
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password_hash: passwordHash,
                    name,
                    role,
                }
            ])
            .select('id, username, name, role, created_at')
            .single();

        if (error) {
            // 重複エラーなどのハンドリング
            if (error.code === '23505') { // unique_violation
                return NextResponse.json(
                    { error: 'Username already exists' },
                    { status: 409 }
                );
            }
            throw error;
        }

        return NextResponse.json(newUser, { status: 201 });

    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
