import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    items?: NavItem[];
}

export interface Course {
    id: number;
    course_code: string;
    title: string;
    description: string | null;
    short_description: string | null;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    status: 'draft' | 'published' | 'archived';
    thumbnail: string | null;
    thumbnail_focus: string | null;
    intro_video: string | null;
    teachers: Teacher[];
    max_students: number | null;
    subjects_count?: number;
    modules_count?: number;
    enrollments_count?: number;
    created_at: string;
    updated_at: string;
}

export interface Section {
    id: number;
    section_name: string;
    subject_id: number;
    course_id: number;
    year_level: '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | null;
    semester: 'First Semester' | 'Second Semester' | 'Summer' | null;
    school_year: string | null;
    room_code: string | null;
    teacher_id: number | null;
    teacher?: { id: number; name: string } | null;
    course?: Course;
    created_at: string;
    updated_at: string;
}

export interface Enrollment {
    id: number;
    user_id: number;
    course_id: number;
    section_id: number | null;
    status: 'active' | 'completed' | 'withdrawn';
    progress_percentage: number;
    completed_lessons: number;
    completed_assignments: number;
    enrollment_date: string;
    created_at: string;
    updated_at: string;
}

export interface Teacher {
    id: number;
    name: string;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    unreadNotificationCount: number;
    [key: string]: unknown;
}

export interface AppNotification {
    id: number;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    data: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    role: 'admin' | 'teacher' | 'student';
    created_at: string;
    updated_at: string;
    firstname?: string | null;
    lastname?: string | null;
    [key: string]: unknown; // This allows for additional properties...
}
