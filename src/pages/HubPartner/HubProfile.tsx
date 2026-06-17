import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function HubProfile() {
  const { profile } = useAuth();
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Hub Partner Profile</h2>
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="font-semibold">Name: </span>
            {profile?.full_name || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Assigned State: </span>
            {profile?.assigned_state || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Role: </span>
            <span className="capitalize">{profile?.role || "N/A"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
