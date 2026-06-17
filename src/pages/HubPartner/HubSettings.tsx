import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HubSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Hub Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive updates and alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive daily booking summaries</p>
            </div>
            <Button variant="outline">Configure</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Alerts</p>
              <p className="text-sm text-muted-foreground">Get instant alerts for new bookings</p>
            </div>
            <Button variant="outline">Configure</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
