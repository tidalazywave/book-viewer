'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Upload, FileText, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UploadPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [bookFile, setBookFile] = useState<File | null>(null);

    const coverInputRef = useRef<HTMLInputElement>(null);
    const bookInputRef = useRef<HTMLInputElement>(null);

    // 権限チェック
    useEffect(() => {
        if (status === 'loading') return;

        if (!session || (session.user as any).role !== 'admin') {
            router.push('/');
        }
    }, [session, status, router]);

    if (status === 'loading' || !session || (session.user as any).role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
        );
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData(event.currentTarget);

        // ファイルが選択されているか確認
        if (!coverFile || !bookFile) {
            setError('Please select both a cover image and a book file.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/books', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to upload book');
            }

            // 成功したらトップページへリダイレクト
            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] p-8 font-sans">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 border border-amber-100">
                <Link href="/" className="inline-flex items-center text-gray-500 hover:text-amber-600 mb-6 transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Library
                </Link>

                <h1 className="text-3xl font-bold text-amber-900 mb-8 font-serif text-center">Upload New Book</h1>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                            placeholder="Enter book title"
                        />
                    </div>

                    {/* Author */}
                    <div>
                        <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                        <input
                            type="text"
                            id="author"
                            name="author"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                            placeholder="Enter author name (optional)"
                        />
                    </div>

                    {/* Level */}
                    <div>
                        <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                        <select
                            id="level"
                            name="level"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                        >
                            <option value="1">Level 1 (Beginner)</option>
                            <option value="2">Level 2 (Elementary)</option>
                            <option value="3">Level 3 (Intermediate)</option>
                            <option value="4">Level 4 (Advanced)</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                            placeholder="Brief description of the book"
                        />
                    </div>

                    {/* Cover Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                        <div
                            onClick={() => coverInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors"
                        >
                            {coverFile ? (
                                <div className="text-center">
                                    <ImageIcon className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                                    <span className="text-sm text-gray-900 font-medium">{coverFile.name}</span>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <Upload className="w-8 h-8 mx-auto mb-2" />
                                    <span className="text-sm">Click to upload cover image</span>
                                    <p className="text-xs mt-1 text-gray-400">JPG, PNG</p>
                                </div>
                            )}
                            <input
                                type="file"
                                name="coverImage"
                                ref={coverInputRef}
                                onChange={(e) => handleFileChange(e, setCoverFile)}
                                accept="image/*"
                                required
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Book File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Book File (PDF or Text)</label>
                        <div
                            onClick={() => bookInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-colors"
                        >
                            {bookFile ? (
                                <div className="text-center">
                                    <FileText className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                                    <span className="text-sm text-gray-900 font-medium">{bookFile.name}</span>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <Upload className="w-8 h-8 mx-auto mb-2" />
                                    <span className="text-sm">Click to upload PDF or Text file</span>
                                    <p className="text-xs mt-1 text-gray-400">.pdf, .txt</p>
                                </div>
                            )}
                            <input
                                type="file"
                                name="bookFile"
                                ref={bookInputRef}
                                onChange={(e) => handleFileChange(e, setBookFile)}
                                accept=".pdf,.txt"
                                required
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-amber-600 text-white py-3 px-4 rounded-md font-bold hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            'Upload Book'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
