import { AdminLayout } from "@/components/admin-layout";
import { AuthGuard } from "@/components/auth-guard";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AdminLayout>{children}</AdminLayout>
    </AuthGuard>
  );
}
