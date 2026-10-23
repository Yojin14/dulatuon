import type { FlipbookPage } from '@/components/flipbook/flipbook-types';

export type ContentType = 'pdf' | 'word' | 'video' | 'youtube' | 'flipbook';

export interface ContentItem {
    id: string;
    dbId?: number;
    type: ContentType;
    title: string;
    description?: string;
    url?: string;
    filename?: string;
    file?: File;
    pages?: FlipbookPage[];
}

export interface QuizQuestion {
    id: string;
    dbId?: number;
    question: string;
    options: string[];
    correctIndex: number;
}

export interface Quiz {
    id: string;
    dbId?: number;
    kind: 'quiz';
    title: string;
    description: string;
    questions: QuizQuestion[];
}

export interface AssignmentSubmission {
    id: number;
    fileName: string;
    filePath: string;
    fileSize: number | null;
    submittedAt: string;
    status: 'submitted' | 'graded' | 'late';
}

export interface Assignment {
    id: string;
    dbId?: number;
    kind: 'assignment';
    title: string;
    instructions: string;
    dueDate: string;
    maxScore: number;
}

export type Assessment = Quiz | Assignment;

export interface Meeting {
    id: string;
    dbId?: number;
    title: string;
    description: string;
    meetLink: string;
    scheduledAt: string;
    timezone: string;
    durationMinutes: number | null;
}

export interface Session {
    id: string;
    dbId?: number;
    itemType: 'session';
    title: string;
    contents: ContentItem[];
    assessments: Assessment[];
    meetings: Meeting[];
}

export interface LessonGroup {
    id: string;
    dbId?: number;
    itemType: 'lesson-group';
    title: string;
    sessions: Session[];
}

export type ModuleItem = Session | LessonGroup;

export interface CourseModule {
    id: string;
    dbId?: number;
    title: string;
    prerequisite?: boolean;
    items: ModuleItem[];
}

export interface Course {
    id: string;
    slug: string;
    courseTitle: string;
    description: string;
    modules: CourseModule[];
}

export interface CourseData {
    id: number;
    title: string;
    description: string;
    course_code: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    status: 'draft' | 'published' | 'archived';
    thumbnail: string | null;
    thumbnail_focus: string;
    intro_video: string | null;
    instructor: { id: number; name: string } | null;
}

export interface QuizSavedState {
    answers: (number | null)[];
    submitted: boolean;
}
