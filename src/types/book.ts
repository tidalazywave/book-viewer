export interface Book {
    id: string;
    title: string;
    author?: string; // 既存データにはないが将来のために残す
    coverImage: string;
    pdfPath: string; // pdfUrl -> pdfPath
    fileType?: 'pdf' | 'text';
    level: number; // string -> number
    description?: string;
}
