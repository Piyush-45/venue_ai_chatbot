// app/admin/components.tsx
"use client";

import { useFormStatus } from "react-dom";

import { deleteAvailableDate } from "./actions";
import { Button } from "@/components/ui/button";

// A small client component to handle the form submission state
export function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add Date"}
        </Button>
    );
}

// A component to handle the delete action
export function DeleteButton({ dateId }: { dateId: number }) {
    const { pending } = useFormStatus();

    // We wrap the button in a form for the delete action
    return (
        <form action={() => deleteAvailableDate(dateId)}>
            <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={pending}
            >
                {pending ? 'Deleting...' : 'Delete'}
            </Button>
        </form>
    )
}