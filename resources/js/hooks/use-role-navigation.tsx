import { dashboard } from '@/routes';
import { type NavGroup, type NavItem } from '@/types';
import {
    Award,
    BarChart3,
    BookOpen,
    Compass,
    FileText,
    LayoutGrid,
    MessageCircle,
    Users,
} from 'lucide-react';

export function useRoleNavigation(userRole: 'admin' | 'teacher' | 'student') {
    const footerNavItems: NavItem[] = [];

    const adminGroup: NavGroup = {
        title: 'Admin',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Analytics',
                href: '/admin/analytics',
                icon: BarChart3,
            },
            {
                title: 'Course Management',
                href: '/courses',
                icon: BookOpen,
            },
    
            {
                title: 'User Management',
                href: '/admin/users',
                icon: Users,
                items: [
                    { title: 'All Users', href: '/admin/users' },
                    { title: 'Role Management', href: '/admin/roles' },
                ],
            },
        ],
    };

    const teacherGroup: NavGroup = {
        title: 'Teacher',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Assigned Courses',
                href: '/my-course',
                icon: BookOpen,
            },
            {
                title: 'Class Management',
                href: '/class-management',
                icon: FileText,
            },
            {
                title: 'Chat',
                href: '/chat',
                icon: MessageCircle,
            },
        ],
    };

    const studentGroup: NavGroup = {
        title: 'Student',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Explore Courses',
                href: '/explore',
                icon: Compass,  
            },
            {
                title: 'My Course',
                href: '/my-course',
                icon: BookOpen,
            },
            {
                title: 'My Progress',
                href: '/my-progress',
                icon: Award,
            },
            {
                title: 'Chat',
                href: '/chat',
                icon: MessageCircle,
            },
        ],
    };

    const withoutDashboard = (group: NavGroup): NavGroup => ({
        ...group,
        items: group.items.filter((item) => item.title !== 'Dashboard'),
    });

    switch (userRole) {
        case 'admin':
            return {
                navGroups: [adminGroup, withoutDashboard(teacherGroup)],
                footerNavItems,
            };
        case 'teacher':
            return {
                navGroups: [teacherGroup],
                footerNavItems,
            };
        case 'student':
        default:
            return {
                navGroups: [studentGroup],
                footerNavItems,
            };
    }
}
