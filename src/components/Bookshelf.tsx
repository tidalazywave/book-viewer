import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, ArrowUpDown, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Book } from '@/types/book';

interface BookshelfProps {
    initialBooks: Book[];
    onBookSelect: (book: Book) => void;
}

type SortOption = 'level-asc' | 'level-desc' | 'title-asc';

export default function Bookshelf({ initialBooks, onBookSelect }: BookshelfProps) {
    const books: Book[] = initialBooks;

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('level-asc');
    const [columns, setColumns] = useState<3 | 5 | 8>(3);
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');

    const filteredAndSortedBooks = useMemo(() => {
        let result = [...books];

        // Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(book =>
                book.title.toLowerCase().includes(query) ||
                book.author?.toLowerCase().includes(query)
            );
        }

        // Filter by Level
        if (filterLevel !== 'all') {
            result = result.filter(book => book.level.toString() === filterLevel);
        }

        // Filter by File Type
        if (filterType !== 'all') {
            result = result.filter(book => book.fileType === filterType);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'level-asc':
                    return a.level - b.level;
                case 'level-desc':
                    return b.level - a.level;
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return result;
    }, [books, searchQuery, sortBy, filterLevel, filterType]);

    // Grid columns class mapping
    const gridColsClass = {
        3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
        8: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-8',
    };

    // Get unique levels for filter
    const uniqueLevels = Array.from(new Set(books.map(b => b.level))).sort((a, b) => a - b);

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
            <h2 className="text-3xl font-bold text-center mb-8 text-amber-900 font-serif">Classroom Library</h2>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-100 mb-8 flex flex-col xl:flex-row gap-4 items-center justify-between">

                {/* Search */}
                <div className="relative w-full xl:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search books..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                </div>

                <div className="flex flex-wrap gap-4 w-full xl:w-auto justify-center xl:justify-end">
                    {/* Filter Level */}
                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="border border-gray-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                        <option value="all">All Levels</option>
                        {uniqueLevels.map(level => (
                            <option key={level} value={level}>Level {level}</option>
                        ))}
                    </select>

                    {/* Filter Type */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border border-gray-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                        <option value="all">All Types</option>
                        <option value="pdf">PDF Books</option>
                        <option value="text">Text Books</option>
                    </select>

                    {/* Sort */}
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                        <ArrowUpDown className="text-gray-400 w-4 h-4" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="border border-gray-200 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        >
                            <option value="level-asc">Level (Low to High)</option>
                            <option value="level-desc">Level (High to Low)</option>
                            <option value="title-asc">Title (A-Z)</option>
                        </select>
                    </div>

                    {/* Grid Layout Toggle */}
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                        <LayoutGrid className="text-gray-400 w-4 h-4" />
                        <div className="flex bg-gray-100 rounded-md p-1">
                            {[3, 5, 8].map((col) => (
                                <button
                                    key={col}
                                    onClick={() => setColumns(col as 3 | 5 | 8)}
                                    className={`px-3 py-1 text-xs rounded-sm transition-colors ${columns === col
                                        ? 'bg-white text-amber-600 shadow-sm font-medium'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {col === 3 ? 'Large' : col === 5 ? 'Medium' : 'Small'}
                                </button>
                            ))}
                        </div>
                    </div>


                </div>
            </div>

            {/* Books Grid */}
            <div className={`grid ${gridColsClass[columns]} gap-8 md:gap-12 transition-all duration-500`}>
                {filteredAndSortedBooks.map((book) => (
                    <div
                        key={book.id}
                        onClick={() => onBookSelect(book)}
                        className="group relative cursor-pointer perspective-1000"
                    >
                        <div className="relative w-full aspect-[3/4] transition-transform duration-300 transform group-hover:-translate-y-2 group-hover:rotate-y-[-5deg] shadow-xl rounded-r-md overflow-hidden bg-white border-l-4 border-l-gray-300">
                            {/* Cover Image */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={book.coverImage}
                                alt={book.title}
                                className="w-full h-full object-cover"
                            />

                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            {/* File Type Badge (New) */}
                            {book.fileType === 'text' && (
                                <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm font-bold opacity-80">
                                    TXT
                                </div>
                            )}
                        </div>

                        {/* Shelf shadow */}
                        <div className="absolute -bottom-4 left-2 right-2 h-4 bg-black/20 blur-md rounded-full opacity-50 group-hover:opacity-70 transition-opacity" />

                        <div className="mt-4 text-center">
                            <h3 className={`font-bold text-gray-800 group-hover:text-amber-700 transition-colors ${columns >= 5 ? 'text-sm truncate' : 'text-lg'}`}>
                                {book.title}
                            </h3>
                            <span className="inline-block px-2 py-1 mt-1 text-xs font-semibold text-white bg-amber-600 rounded-full">
                                Level {book.level}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {filteredAndSortedBooks.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    No books found matching your search.
                </div>
            )}

            {/* Shelf board visual */}
            <div className="mt-12 h-4 bg-amber-800 rounded shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
            </div>
        </div>
    );
}
