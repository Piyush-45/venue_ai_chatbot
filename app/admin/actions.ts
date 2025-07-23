"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

// Type for the return value of our actions
interface ActionResult {
    success: boolean;
    message: string;
}

/**
 * Server Action to add a new available date to the database.
 * @param formData - The form data containing the date to add.
 * @returns An object indicating success or failure.
 */
export async function addAvailableDate(formData: FormData): Promise<ActionResult> {
    const dateStr = formData.get("date") as string;

    if (!dateStr) {
        return { success: false, message: "Date is required." };
    }

    // Create a new Date object. It's important to handle timezones correctly.
    // By creating the date this way, we get the UTC date at midnight.
    const date = new Date(dateStr);

    try {
        await prisma.availableDate.create({
            data: {
                date: date,
            },
        });

        // Revalidate the /admin path to show the new date immediately
        revalidatePath("/admin");
        return { success: true, message: "Date added successfully!" };

    } catch (error: any) {
        // Handle potential errors, like adding a duplicate date
        if (error.code === 'P2002') { // Prisma's unique constraint violation code
            return { success: false, message: "This date is already marked as available." };
        }
        console.error(error);
        return { success: false, message: "An unexpected error occurred." };
    }
}

/**
 * Server Action to delete an available date from the database.
 * @param dateId - The ID of the date to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteAvailableDate(dateId: number): Promise<ActionResult> {
    if (!dateId) {
        return { success: false, message: "Date ID is required." };
    }

    try {
        await prisma.availableDate.delete({
            where: { id: dateId },
        });

        revalidatePath("/admin");
        return { success: true, message: "Date removed successfully." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to remove date." };
    }
}
