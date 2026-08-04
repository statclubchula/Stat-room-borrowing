import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata = {
  title: "Stat Club Admin",
  description: "Inventory Control and History",
};

export default function AdminPage() {
  return (
    <div className="container py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            Stat Club Admin
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Return to Homepage
          </Link>
        </Button>
      </div>

      <AdminGate>
        <AdminPanel />
      </AdminGate>
    </div>
  );
}
