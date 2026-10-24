import { store } from '@/routes/login';
import { Form, Head } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginProps {
    status?: string;
}

export default function Login({ status }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <AuthLayout
            title="Welcome back"
            description="Log in to pick up your quest where you left off."
        >
            <Head title="Log in" />

            {status && (
                <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {status}
                </div>
            )}

            <Form {...store.form()} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    autoFocus
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    <TextLink
                                        href="/forgot-password"
                                        className="ml-auto text-sm"
                                    >
                                        Forgot your password?
                                    </TextLink>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        name="password"
                                        autoComplete="current-password"
                                        placeholder="Password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((v) => !v)
                                        }
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                        aria-label={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="mt-2 w-full"
                                disabled={processing}
                            >
                                {processing && (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                )}
                                Log in
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{' '}
                            <TextLink href="/register">Sign up</TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
