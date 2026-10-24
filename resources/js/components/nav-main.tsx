import { Icon } from '@/components/icon';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { resolveUrl } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

// Collapsed: a centred 44px icon only. The label and sub-menu arrow are hidden, not clipped,
// so no sliver of text shows beside the icon.
const itemClass =
    'h-11 group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span]:hidden group-data-[collapsible=icon]:[&>svg:not(:first-child)]:hidden';

export function NavMain({
    items = [],
    label = 'Platform',
}: {
    items: NavItem[];
    label?: string;
}) {
    const page = usePage();
    const pathname = page.url.split('?')[0];

    return (
        <SidebarGroup className="px-3 py-1 md:px-2">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) =>
                    item.items && item.items.length > 0 ? (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={item.items.some((sub) =>
                                pathname.startsWith(resolveUrl(sub.href)),
                            )}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={{ children: item.title }}
                                        className={itemClass}
                                        isActive={item.items.some((sub) =>
                                            pathname.startsWith(
                                                resolveUrl(sub.href),
                                            ),
                                        )}
                                    >
                                        {item.icon && (
                                            <Icon
                                                iconNode={item.icon}
                                                className="size-[18px]"
                                            />
                                        )}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items.map((sub) => (
                                            <SidebarMenuSubItem key={sub.title}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={
                                                        pathname ===
                                                            resolveUrl(
                                                                sub.href,
                                                            ) ||
                                                        pathname.startsWith(
                                                            resolveUrl(
                                                                sub.href,
                                                            ) + '/',
                                                        )
                                                    }
                                                >
                                                    <Link
                                                        href={sub.href}
                                                        prefetch
                                                    >
                                                        {sub.icon && (
                                                            <Icon
                                                                iconNode={
                                                                    sub.icon
                                                                }
                                                                className="h-4 w-4"
                                                            />
                                                        )}
                                                        <span>{sub.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname.startsWith(
                                    resolveUrl(item.href),
                                )}
                                tooltip={{ children: item.title }}
                                className={itemClass}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && (
                                        <Icon
                                            iconNode={item.icon}
                                            className="size-[18px]"
                                        />
                                    )}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
