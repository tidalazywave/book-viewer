import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

// Supabaseのバケット名
const BUCKET_NAME = 'books';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        // Individual book fetch
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
    } else {
        // List fetch
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(data);
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

        const formData = await request.formData();
        const title = formData.get('title') as string;
        const author = formData.get('author') as string;
        const level = parseInt(formData.get('level') as string) || 1;
        const description = formData.get('description') as string;
        const coverFile = formData.get('coverImage') as File;
        const bookFile = formData.get('bookFile') as File;

        if (!title || !coverFile || !bookFile) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // ファイルタイプの判定
        const isPdf = bookFile.name.toLowerCase().endsWith('.pdf');
        const isText = bookFile.name.toLowerCase().endsWith('.txt');

        if (!isPdf && !isText) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDF or TXT allowed.' },
                { status: 400 }
            );
        }

        const fileType = isPdf ? 'pdf' : 'text';
        const bookId = uuidv4();

        // 2. Supabase Storageへアップロード

        // 表紙画像のアップロード
        const coverExtension = coverFile.name.split('.').pop();
        const coverFileName = `${bookId}_cover.${coverExtension}`;
        const coverBuffer = await coverFile.arrayBuffer();

        const { error: coverUploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(coverFileName, coverBuffer, {
                contentType: coverFile.type,
                upsert: true
            });

        if (coverUploadError) {
            console.error('Cover upload error:', coverUploadError);
            throw new Error(`Cover upload failed: ${coverUploadError.message}`);
        }

        // 本文ファイルのアップロード
        const bookExtension = bookFile.name.split('.').pop();
        const bookFileName = `${bookId}_file.${bookExtension}`;
        const bookBuffer = await bookFile.arrayBuffer();

        const { error: bookUploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(bookFileName, bookBuffer, {
                contentType: bookFile.type,
                upsert: true
            });

        if (bookUploadError) {
            console.error('Book upload error:', bookUploadError);
            throw new Error(`Book upload failed: ${bookUploadError.message}`);
        }

        // 公開URLの取得
        const { data: { publicUrl: coverUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(coverFileName);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(bookFileName);

        // 3. Supabase Databaseへメタデータ保存
        const { data, error: dbError } = await supabase
            .from('books')
            .insert([
                {
                    id: bookId,
                    title,
                    author,
                    level,
                    description,
                    cover_url: coverUrl,
                    file_url: fileUrl,
                    file_type: fileType,
                }
            ])
            .select()
            .single();

        if (dbError) {
            console.error('DB Insert error:', dbError);
            throw new Error(`Database insert failed: ${dbError.message}`);
        }

        return NextResponse.json({ success: true, book: data });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);

    // Admin check
    if (!session || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    try {
        // 1. Get book details to find file paths
        const { data: book, error: fetchError } = await supabase
            .from('books')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // 2. Delete files from Storage
        const filesToDelete = [];
        if (book.cover_url) {
            const coverPath = book.cover_url.split('/').pop(); // Extract filename
            if (coverPath) filesToDelete.push(coverPath);
        }
        if (book.file_url) {
            const filePath = book.file_url.split('/').pop(); // Extract filename
            if (filePath) filesToDelete.push(filePath);
        }

        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove(filesToDelete);

            if (storageError) {
                console.error('Storage delete error:', storageError);
                // Continue to delete DB record even if storage delete fails
            }
        }

        // 3. Delete record from Database
        const { error: deleteError } = await supabase
            .from('books')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await getServerSession(authOptions);

    // Admin check
    if (!session || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, title, author, level, description } = body;

        if (!id) {
            return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('books')
            .update({ title, author, level, description })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
    }
}
