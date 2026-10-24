import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';

export interface GradeSummary {
    points: number;
    possible: number;
    percent: number;
    feedback: string | null;
    gradedAt: string | null;
}

const QUICK_PERCENTS = [100, 90, 75, 50];

/**
 * Score a submission and leave feedback. Used by the Assignments hub and Class Management.
 * Grading again updates the same grade; the student gets a notification each time.
 */
export function GradeDialog({
    open,
    onOpenChange,
    submissionId,
    studentName,
    assignmentTitle,
    maxPoints,
    current,
    onGraded,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    submissionId: number;
    studentName: string;
    assignmentTitle: string;
    maxPoints: number;
    current: GradeSummary | null;
    onGraded: (grade: GradeSummary) => void;
}) {
    const [points, setPoints] = useState(current ? String(current.points) : '');
    const [feedback, setFeedback] = useState(current?.feedback ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const numeric = Number(points);
    const valid =
        points.trim() !== '' &&
        Number.isFinite(numeric) &&
        numeric >= 0 &&
        numeric <= maxPoints;

    const save = async () => {
        if (!valid || saving) {
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
            const res = await fetch(
                `/assignments/submissions/${submissionId}/grade`,
                {
                    method: 'PUT',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        points: numeric,
                        feedback: feedback.trim() || null,
                    }),
                },
            );
            const body = (await res
                .json()
                .catch(() => ({}))) as GradeSummary & {
                message?: string;
                errors?: Record<string, string[]>;
            };
            if (!res.ok) {
                throw new Error(
                    body.errors
                        ? Object.values(body.errors)[0]?.[0]
                        : (body.message ?? 'Could not save the grade.'),
                );
            }
            onGraded(body);
            onOpenChange(false);
            toast(`Graded ${studentName}: ${numeric}/${maxPoints}`, 'success');
        } catch (e) {
            setError((e as Error).message || 'Could not save the grade.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogTitle>
                    {current ? 'Edit grade' : 'Grade submission'}
                </DialogTitle>
                <DialogDescription>
                    {studentName} · {assignmentTitle}
                </DialogDescription>

                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor={`grade-points-${submissionId}`}>
                            Score
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id={`grade-points-${submissionId}`}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={maxPoints}
                                step="0.5"
                                value={points}
                                onChange={(event) =>
                                    setPoints(event.target.value)
                                }
                                className="w-28 text-lg font-bold"
                                autoFocus
                            />
                            <span className="text-sm font-semibold text-muted-foreground">
                                of {maxPoints} points
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_PERCENTS.map((percent) => {
                                const value =
                                    Math.round(
                                        ((maxPoints * percent) / 100) * 2,
                                    ) / 2;

                                return (
                                    <button
                                        key={percent}
                                        type="button"
                                        onClick={() => setPoints(String(value))}
                                        className={cn(
                                            'cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-colors',
                                            numeric === value && points !== ''
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {percent}%
                                    </button>
                                );
                            })}
                        </div>
                        {points !== '' && !valid && (
                            <InputError
                                message={`Enter a score from 0 to ${maxPoints}.`}
                            />
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor={`grade-feedback-${submissionId}`}>
                            Feedback (optional)
                        </Label>
                        <Textarea
                            id={`grade-feedback-${submissionId}`}
                            value={feedback}
                            onChange={(event) =>
                                setFeedback(event.target.value)
                            }
                            rows={4}
                            maxLength={2000}
                            placeholder="What went well, and what to improve next time."
                        />
                    </div>

                    <InputError message={error ?? undefined} />

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!valid || saving}>
                            {saving && (
                                <LoaderCircle className="animate-spin" />
                            )}
                            Save grade
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
