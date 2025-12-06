'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

// Workerの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FlipBookProps {
    pdfPath: string;
    onClose: () => void;
    bookId: string;
}

// PageコンポーネントをforwardRefでラップ
const PDFPage = React.forwardRef<HTMLDivElement, { pageNumber: number; width: number }>((props, ref) => {
    return (
        <div ref={ref} className="bg-white shadow-md overflow-hidden border-r border-gray-200">
            <Page
                pageNumber={props.pageNumber}
                width={props.width}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="h-full"
            />
            <div className="absolute bottom-4 w-full text-center text-xs text-gray-400">
                - {props.pageNumber} -
            </div>
        </div>
    );
});
PDFPage.displayName = 'PDFPage';

export default function FlipBook({ pdfPath, onClose, bookId }: FlipBookProps) {
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const isMobile = windowSize.width < 768; // Adjust breakpoint as needed

    const [numPages, setNumPages] = useState<number>(0);
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

        // Initial size
        if (typeof window !== 'undefined') {
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // 履歴の取得
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/readings?bookId=${bookId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && typeof data.last_page === 'number') {
                        setStartPage(data.last_page);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch reading history', error);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [bookId]);

    // 履歴の保存
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

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const nextPage = useCallback(() => {
        bookRef.current?.pageFlip()?.flipNext();
    }, []);

    const prevPage = useCallback(() => {
        bookRef.current?.pageFlip()?.flipPrev();
    }, []);

    const bookWidth = isMobile ? Math.min(windowSize.width - 40, 400) : 400;
    const bookHeight = isMobile ? Math.min(windowSize.height - 100, 600) : 570;

    if (isLoadingHistory) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
                <div className="text-white flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span>Loading history...</span>
                </div>
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
                    <Document
                        file={pdfPath}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="text-white">Loading Book...</div>}
                        error={<div className="text-red-400">Failed to load book.</div>}
                    >
                        {numPages > 0 && (
                            // @ts-ignore
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
                                {Array.from(new Array(numPages), (el, index) => (
                                    <PDFPage key={`page_${index + 1}`} pageNumber={index + 1} width={bookWidth} />
                                ))}
                            </HTMLFlipBook>
                        )}
                    </Document>
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
