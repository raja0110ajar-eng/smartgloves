import AdminBar from "@/components/AdminBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminBar />
      {children}
    </>
  );
}