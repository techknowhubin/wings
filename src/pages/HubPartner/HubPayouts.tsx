import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function HubPayouts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Payouts
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and view your withdrawal requests and payout history.</p>
      </div>

      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-xl font-bold">Payouts Coming Soon</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            The automated payout system is currently being set up. Soon you'll be able to request withdrawals and view all historical payouts here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
