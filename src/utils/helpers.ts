
export const MAX_TOTAL_SIZE_MB = 15;
export const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;

export const AVAILABLE_MODELS = [
 'gemini-2.5-flash',
 'gemini-2.5-pro',
 'gemini-2.5-flash-lite',
 'gemini-2.0-flash',
];

export const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif'
];

// Helper function to encode a UTF-8 string to Base64, correctly handling Unicode characters.
export function unicodeToBase64(str: string): string {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(_match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
}

// Helper function to decode a Base64 string to UTF-8, correctly handling Unicode characters.
export function base64ToUnicode(str: string): string {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}
