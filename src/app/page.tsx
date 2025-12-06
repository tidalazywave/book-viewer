'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Bookshelf from '@/components/Bookshelf';
// Use dynamic imports for components that use browser-specific APIs (like DOMMatrix, Canvas)
const FlipBook = dynamic(() => import('@/components/FlipBook'), { ssr: false });
const TextFlipBook = dynamic(() => import('@/components/TextFlipBook'), { ssr: false });
import { Book } from '@/types/book';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, Users, BookOpen } from 'lucide-react';

export default function Home() {

  const { data: session, status } = useSession();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return; // Only fetch if authenticated

    async function fetchBooks() {
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching books:', error);
        } else if (data) {
          // DB(snake_case) -> App(camelCase) conversion
          const formattedBooks: Book[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            level: item.level,
            description: item.description,
            coverImage: item.cover_url || '/books/covers/default.jpg', // Fallback
            pdfPath: item.file_url, // Map file_url to pdfPath (legacy name in type)
            fileType: item.file_type || 'pdf',
          }));
          setBooks(formattedBooks);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
        <div className="text-amber-800 animate-pulse font-serif text-xl">Loading library...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fdfbf7] text-gray-800 font-sans">
      {/* Header */}
      <header className="w-full p-6 bg-white border-b border-amber-100 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-600 rounded-md flex items-center justify-center text-white font-bold font-serif">
            B
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">BookViewer <span className="text-amber-600 font-normal text-sm ml-1">for Students</span></h1>
        </div>
        <div className="flex items-center gap-4">

          {/* Admin Only Link */}
          {session?.user && (session.user as any).role === 'admin' && (
            <div className="flex gap-2">
              <Link
                href="/upload"
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Upload Book (Admin)
              </Link>
              <Link
                href="/admin/books"
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
              >
                <BookOpen className="w-4 h-4" />
                Manage Books
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Users className="w-4 h-4" />
                Manage Users
              </Link>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Welcome, {session?.user?.name || 'Student'}!</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto py-8">
        <Bookshelf initialBooks={books} onBookSelect={setSelectedBook} />
      </div>

      {/* Reader Modal */}
      {selectedBook && (
        selectedBook.fileType === 'text' ? (
          <TextFlipBook
            textPath={selectedBook.pdfPath}
            onClose={() => setSelectedBook(null)}
            title={selectedBook.title}
            bookId={selectedBook.id}
          />
        ) : (
          <FlipBook
            pdfPath={selectedBook.pdfPath}
            onClose={() => setSelectedBook(null)}
            bookId={selectedBook.id}
          />
        )
      )}
    </main>
  );
}
