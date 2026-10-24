import { GENDER_OPTIONS, type Gender } from '@/lib/avatar-presets';
import { cn } from '@/lib/utils';

/**
 * Three segmented radio buttons. Works inside a plain <Form> (uncontrolled, via `defaultValue`)
 * or with `useForm` (controlled, via `value` + `onChange`).
 */
export function GenderChoice({
    name = 'gender',
    value,
    defaultValue,
    onChange,
    invalid = false,
}: {
    name?: string;
    value?: Gender | '';
    defaultValue?: Gender | null;
    onChange?: (gender: Gender) => void;
    invalid?: boolean;
}) {
    return (
        <div
            role="radiogroup"
            aria-label="Gender"
            aria-invalid={invalid || undefined}
            className={cn(
                'grid grid-cols-3 gap-1 rounded-xl bg-muted p-1',
                invalid && 'ring-2 ring-destructive/40',
            )}
        >
            {GENDER_OPTIONS.map((option) => (
                <label key={option.value} className="relative">
                    <input
                        type="radio"
                        name={name}
                        value={option.value}
                        className="peer sr-only"
                        {...(value !== undefined
                            ? {
                                  checked: value === option.value,
                                  onChange: () => onChange?.(option.value),
                              }
                            : {
                                  defaultChecked: defaultValue === option.value,
                                  onChange: () => onChange?.(option.value),
                              })}
                    />
                    <span className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm leading-tight font-semibold text-muted-foreground transition-colors peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 hover:text-foreground">
                        {option.label}
                    </span>
                </label>
            ))}
        </div>
    );
}
