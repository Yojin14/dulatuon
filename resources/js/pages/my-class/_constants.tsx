import { BookOpen, File, FileText, PlayCircle, Video } from 'lucide-react';
import type { ContentType } from './_types';

export const CONTENT_META: Record<
    ContentType,
    { label: string; icon: React.ReactNode; badge: string }
> = {
    pdf: {
        label: 'PDF',
        icon: <FileText className="h-3.5 w-3.5" />,
        badge: 'bg-red-100 text-red-700',
    },
    word: {
        label: 'Word',
        icon: <File className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
    },
    video: {
        label: 'Video',
        icon: <Video className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
    },
    youtube: {
        label: 'YouTube',
        icon: <PlayCircle className="h-3.5 w-3.5" />,
        badge: 'bg-rose-100 text-rose-700',
    },
    flipbook: {
        label: 'Flipbook',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        badge: 'bg-violet-100 text-violet-700',
    },
};

export const ACCEPTED_TYPES =
    '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.heic';
export const ACCEPTED_LABEL =
    'PDF, Word (.docx), Excel (.xlsx), or image files';

export const FILE_ACCEPT: Record<ContentType, string> = {
    pdf: 'application/pdf,.pdf',
    word: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword',
    video: 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov',
    youtube: '',
    flipbook: '',
};

export const WORLD_ZONES = [
    { tz: 'UTC', flag: '🌐', city: 'UTC' },
    { tz: 'America/New_York', flag: '🇺🇸', city: 'New York' },
    { tz: 'America/Chicago', flag: '🇺🇸', city: 'Chicago' },
    { tz: 'America/Los_Angeles', flag: '🇺🇸', city: 'Los Angeles' },
    { tz: 'America/Sao_Paulo', flag: '🇧🇷', city: 'São Paulo' },
    { tz: 'Europe/London', flag: '🇬🇧', city: 'London' },
    { tz: 'Europe/Paris', flag: '🇪🇺', city: 'Paris' },
    { tz: 'Europe/Moscow', flag: '🇷🇺', city: 'Moscow' },
    { tz: 'Asia/Dubai', flag: '🇦🇪', city: 'Dubai' },
    { tz: 'Asia/Karachi', flag: '🇵🇰', city: 'Karachi' },
    { tz: 'Asia/Kolkata', flag: '🇮🇳', city: 'Mumbai' },
    { tz: 'Asia/Bangkok', flag: '🇹🇭', city: 'Bangkok' },
    { tz: 'Asia/Manila', flag: '🇵🇭', city: 'Manila' },
    { tz: 'Asia/Shanghai', flag: '🇨🇳', city: 'Beijing' },
    { tz: 'Asia/Tokyo', flag: '🇯🇵', city: 'Tokyo' },
    { tz: 'Asia/Seoul', flag: '🇰🇷', city: 'Seoul' },
    { tz: 'Australia/Sydney', flag: '🇦🇺', city: 'Sydney' },
    { tz: 'Pacific/Auckland', flag: '🇳🇿', city: 'Auckland' },
];

export const TZ_GROUPS = [
    { label: 'UTC', options: ['UTC'] },
    {
        label: 'Americas',
        options: [
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Anchorage',
            'America/Sao_Paulo',
            'America/Mexico_City',
            'America/Toronto',
            'America/Vancouver',
        ],
    },
    {
        label: 'Europe',
        options: [
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Europe/Rome',
            'Europe/Madrid',
            'Europe/Amsterdam',
            'Europe/Moscow',
            'Europe/Istanbul',
        ],
    },
    {
        label: 'Africa & Middle East',
        options: [
            'Africa/Cairo',
            'Africa/Johannesburg',
            'Asia/Riyadh',
            'Asia/Dubai',
            'Asia/Kuwait',
        ],
    },
    {
        label: 'Asia',
        options: [
            'Asia/Karachi',
            'Asia/Kolkata',
            'Asia/Dhaka',
            'Asia/Bangkok',
            'Asia/Singapore',
            'Asia/Manila',
            'Asia/Shanghai',
            'Asia/Tokyo',
            'Asia/Seoul',
            'Asia/Hong_Kong',
        ],
    },
    {
        label: 'Oceania',
        options: [
            'Australia/Perth',
            'Australia/Adelaide',
            'Australia/Sydney',
            'Australia/Melbourne',
            'Pacific/Auckland',
            'Pacific/Honolulu',
        ],
    },
];

export const LEVEL_COLORS: Record<string, string> = {
    Beginner:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Intermediate:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const STATUS_COLORS: Record<string, string> = {
    published:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
