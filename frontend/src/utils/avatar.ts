/**
 * 기본 아바타 이미지 생성 유틸리티
 * 한글 닉네임을 안전하게 처리하여 SVG 아바타 생성
 */

/**
 * 닉네임으로부터 기본 아바타 이미지 생성
 * @param name - 사용자 닉네임
 * @returns Data URL 형식의 SVG 이미지
 */
export const defaultAvatar = (name: string): string => {
    // 한글 닉네임 처리: 첫 글자 추출
    const firstChar = name.trim().charAt(0) || '?';
    const initial = firstChar.toUpperCase();
    
    // SVG 생성 (한글 문자를 안전하게 처리)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="#6B7280" />
        <text x="50%" y="50%" dy=".1em" dominant-baseline="central" text-anchor="middle" font-size="16" font-family="sans-serif" fill="white" font-weight="bold">${initial}</text>
    </svg>`;
    
    // 한글을 포함한 문자열을 안전하게 base64 인코딩
    try {
        // 방법 1: encodeURIComponent + unescape 사용 (가장 호환성 좋음)
        const encoded = encodeURIComponent(svg);
        const base64 = btoa(unescape(encoded));
        return `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
        // 방법 2: TextEncoder 사용 (폴백)
        try {
            const encoder = new TextEncoder();
            const bytes = encoder.encode(svg);
            const binary = String.fromCharCode(...bytes);
            const base64 = btoa(binary);
            return `data:image/svg+xml;base64,${base64}`;
        } catch (fallbackError) {
            // 최종 폴백: URL 인코딩 사용 (base64 없이)
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }
    }
};

