import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TEXT_SCALE_OPTIONS, useTextScale } from '@/hooks/use-text-scale';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editAppearance } from '@/routes/appearance';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: editAppearance().url,
    },
];

export default function Appearance() {
    const { textScale, updateTextScale } = useTextScale();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Appearance"
                        description="Choose light or dark mode and how large text appears. Saved on this device."
                    />
                    <AppearanceTabs />

                    <div className="space-y-2">
                        <p className="text-sm font-bold">Text size</p>
                        <p className="text-sm text-muted-foreground">
                            Make every page easier to read, including lessons
                            and flipbooks.
                        </p>
                        <Select
                            value={textScale}
                            onValueChange={updateTextScale}
                        >
                            <SelectTrigger className="w-56">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TEXT_SCALE_OPTIONS.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
