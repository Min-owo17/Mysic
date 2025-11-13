
export const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const timeAgo = (isoString: string): string => {
    const date = new Date(isoString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "년 전";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "달 전";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "일 전";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "시간 전";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "분 전";
    
    return "방금 전";
};
