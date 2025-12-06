import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const bookId = searchParams.get('bookId');
        const userId = (session.user as any).id;

        let query = supabase
            .from('readings')
            .select('*')
            .eq('user_id', userId) as any;

        if (bookId) {
            query = query.eq('book_id', bookId).single();
        } else {
            query = query.order('last_read_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows" for single()
            throw error;
        }

        // single() でデータがない場合は null を返すのではなく空オブジェクトや404を返す設計も考えられるが、
        // ここでは履歴がない＝未読として扱うため、bookId指定時はnull(データなし)を許容してそのまま返す。
        return NextResponse.json(data || null);

    } catch (error: any) {
        console.error('Error fetching readings:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await request.json();
        const { bookId, lastPage, isFinished } = body;

        if (!bookId || lastPage === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: bookId, lastPage' },
                { status: 400 }
            );
        }

        // Upsert (Insert or Update)
        // conflict target details: unique constraint on (user_id, book_id)
        const { data, error } = await supabase
            .from('readings')
            .upsert(
                {
                    user_id: userId,
                    book_id: bookId,
                    last_page: lastPage,
                    is_finished: isFinished || false,
                    last_read_at: new Date().toISOString(),
                },
                { onConflict: 'user_id, book_id' }
            )
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Error saving reading progress:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
