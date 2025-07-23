import prisma from "@/lib/prisma";
import { addAvailableDate } from "./actions";

// Import the new client components
import { SubmitButton, DeleteButton } from "./components";
import { Input } from "@/components/ui/input";

export default async function AdminPage() {
    // Fetch all available dates directly in the Server Component
    const availableDates = await prisma.availableDate.findMany({
        orderBy: {
            date: "asc",
        },
    });

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Section to add a new date */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Add New Available Date</h2>
                    <form action={addAvailableDate} className="space-y-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                                Select a Date
                            </label>
                            <Input
                                type="date"
                                id="date"
                                name="date"
                                required
                                className="w-full"
                            />
                        </div>
                        <SubmitButton />
                    </form>
                </div>

                {/* Section to display existing dates */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Current Available Dates</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {availableDates.length > 0 ? (
                            availableDates.map((d) => (
                                <div key={d.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                                    <p className="font-mono text-gray-800">
                                        {d.date.toLocaleDateString('en-CA')} {/* 'en-CA' gives YYYY-MM-DD format */}
                                    </p>
                                    <DeleteButton dateId={d.id} />
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No available dates have been added yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
