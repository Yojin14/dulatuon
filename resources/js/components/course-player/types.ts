import { type FlipbookPage } from '@/components/flipbook/flipbook-types';
import { File } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
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
    submissionType?: 'text' | 'file' | 'video' | 'both';
    textContent?: string | null;
    videoUrl?: string | null;
    fileName: string | null;
    filePath: string | null;
    fileSize: number | null;
    submittedAt: string;
    status: 'submitted' | 'graded' | 'late';
    grade?: {
        points: number;
        possible: number;
        percent: number;
        feedback: string | null;
        gradedAt: string | null;
    } | null;
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

export type GameType =
    | 'quiz_quest'
    | 'memory_match'
    | 'word_scramble'
    | 'crossword'
    | 'hangman'
    | 'fault_lab'
    | 'shake_town'
    | 'wave_tank'
    | 'quake_tracker'
    | 'ground_test'
    | 'quake_ready';

export interface GameItem {
    prompt: string;
    answer: string;
    distractors: string[];
}

export interface Game {
    id: string;
    dbId?: number;
    title: string;
    description?: string;
    gameType: GameType;
    points: number;
    lives: number;
    items: GameItem[];
}

export interface Session {
    id: string;
    dbId?: number;
    itemType: 'session';
    title: string;
    contents: ContentItem[];
    assessments: Assessment[];
    meetings: Meeting[];
    games?: Game[];
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
