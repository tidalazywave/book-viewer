'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

interface TextFlipBookProps {
    textPath: string;
    onClose: () => void;
    title?: string;
    bookId: string;
}

// 1ページあたりの目安文字数
const CHARS_PER_PAGE = 500;

// Pageコンポーネント
const TextPage = React.forwardRef<HTMLDivElement, { pageNumber: number; content: string; title?: string }>((props, ref) => {
    return (
        <div ref={ref} className="bg-[#fdfbf7] shadow-md overflow-hidden border-r border-gray-200 h-full p-8 flex flex-col">
            <div className="flex-1 font-serif text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                {props.content}
            </div>
            <div className="mt-4 w-full flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-2">
                <span>{props.title}</span>
                <span>- {props.pageNumber} -</span>
            </div>
        </div>
    );
});
TextPage.displayName = 'TextPage';

export default function TextFlipBook({ textPath, onClose, title, bookId }: TextFlipBookProps) {
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const isMobile = windowSize.width < 768;

    const [pages, setPages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const bookRef = useRef<any>(null);
    const [startPage, setStartPage] = useState(0);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        if (typeof window !== 'undefined') {
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // テキスト読み込み & 履歴取得
    useEffect(() => {
        async function init() {
            try {
                setLoading(true);
                // 1. Load Text
                const response = await fetch(textPath);
                if (!response.ok) {
                    throw new Error('Failed to load text file');
                }
                const text = await response.text();
                const splitPages = [];
                for (let i = 0; i < text.length; i += CHARS_PER_PAGE) {
                    splitPages.push(text.slice(i, i + CHARS_PER_PAGE));
                }
                if (splitPages.length === 0) splitPages.push('No content.');
                setPages(splitPages);

                // 2. Fetch History
                const historyRes = await fetch(`/api/readings?bookId=${bookId}`);
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    if (data && typeof data.last_page === 'number') {
                        // テキストの場合、ページ数が変わる可能性があるので範囲チェック
                        const pageIndex = Math.min(data.last_page, splitPages.length);
                        setStartPage(pageIndex);
                    }
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
                setIsLoadingHistory(false);
            }
        }
        init();
    }, [textPath, bookId]);

    // 履歴保存
    const saveProgress = useCallback(async (pageIndex: number) => {
        try {
            await fetch('/api/readings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    lastPage: pageIndex,
                    isFinished: false
                }),
            });
        } catch (error) {
            console.error('Failed to save progress', error);
        }
    }, [bookId]);

    const onFlip = useCallback((e: any) => {
        const newPageIndex = e.data;
        saveProgress(newPageIndex);
    }, [saveProgress]);

    // Navigation
    const nextPage = useCallback(() => {
        bookRef.current?.pageFlip()?.flipNext();
    }, []);

    const prevPage = useCallback(() => {
        bookRef.current?.pageFlip()?.flipPrev();
    }, []);

    const bookWidth = isMobile ? Math.min(windowSize.width - 40, 400) : 400;
    const bookHeight = isMobile ? Math.min(windowSize.height - 100, 600) : 570;

    if (loading || isLoadingHistory) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
                <div className="text-white flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span>Loading content...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
                <div className="text-red-400 text-xl">Error: {error}</div>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white">
                    <X className="w-8 h-8" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm p-4">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
            >
                <X className="w-8 h-8" />
            </button>

            <div className="relative w-full max-w-6xl flex items-center justify-center h-full">
                {/* Navigation Buttons */}
                <button
                    onClick={prevPage}
                    className="absolute left-0 z-10 p-3 text-white/50 hover:text-white transition-colors hidden md:block"
                >
                    <ChevronLeft className="w-10 h-10" />
                </button>

                <div className="relative shadow-2xl flex justify-center items-center">
                    {/* @ts-ignore */}
                    <HTMLFlipBook
                        width={bookWidth}
                        height={bookHeight}
                        size="fixed"
                        minWidth={300}
                        maxWidth={500}
                        minHeight={400}
                        maxHeight={700}
                        maxShadowOpacity={0.5}
                        showCover={true}
                        mobileScrollSupport={true}
                        ref={bookRef}
                        className="demo-book"
                        style={{}}
                        startPage={startPage}
                        drawShadow={true}
                        flippingTime={1000}
                        usePortrait={isMobile}
                        startZIndex={0}
                        autoSize={true}
                        clickEventForward={true}
                        useMouseEvents={true}
                        swipeDistance={30}
                        showPageCorners={true}
                        disableFlipByClick={false}
                        onFlip={onFlip}
                    >
                        {/* 表紙（タイトルページ） */}
                        <div className="bg-[#f0e6d2] shadow-md overflow-hidden border-r border-gray-300 h-full flex flex-col items-center justify-center p-8 text-center">
                            <h1 className="text-3xl font-serif font-bold text-amber-900 mb-4">{title || 'Untitled'}</h1>
                            <div className="w-16 h-1 bg-amber-700 mb-8"></div>
                            <p className="text-amber-800">Text Reader Edition</p>
                        </div>

                        {/* 本文ページ */}
                        {pages.map((content, index) => (
                            <TextPage
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                content={content}
                                title={title}
                            />
                        ))}
                    </HTMLFlipBook>
                </div>

                <button
                    onClick={nextPage}
                    className="absolute right-0 z-10 p-3 text-white/50 hover:text-white transition-colors hidden md:block"
                >
                    <ChevronRight className="w-10 h-10" />
                </button>
            </div>
        </div>
    );
}
