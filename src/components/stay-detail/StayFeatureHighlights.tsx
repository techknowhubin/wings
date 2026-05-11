import { Monitor, DoorOpen, CalendarX2 } from "lucide-react";

interface StayFeatureHighlightsProps {
  cancellationPolicy: string;
}

const StayFeatureHighlights = ({ cancellationPolicy }: StayFeatureHighlightsProps) => {
  const features = [
    {
      icon: Monitor,
      title: "Dedicated workspace",
      description: "A common area with wifi well-suited for working.",
    },
    {
      icon: DoorOpen,
      title: "Self check-in",
      description: "Check yourself in with the lockbox.",
    },
    {
      icon: CalendarX2,
      title: "Free cancellation",
      description: cancellationPolicy || "Free cancellation for 48 hours.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-border">
      {features.map((feature) => (
        <div key={feature.title} className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-secondary">
            <feature.icon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StayFeatureHighlights;
