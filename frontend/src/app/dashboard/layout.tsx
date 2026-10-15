import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GitHubHeader } from "@/components/layout/GitHubHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans">
      <GitHubHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {children}
      </main>
    </div>
  );
}
