import Chat from "@/components/Chat";



export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        AI Wedding Venue Assistant
      </h1>
      <Chat />
    </main>
  );
}
