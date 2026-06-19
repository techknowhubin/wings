import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export type ItineraryDay = {
  id: string;
  day_number: number;
  title: string;
  description: string;
  meals: string;
  stay_details: string;
  activities: string;
};

interface ManualItineraryBuilderProps {
  days: ItineraryDay[];
  onChange: (days: ItineraryDay[]) => void;
}

export function ManualItineraryBuilder({ days, onChange }: ManualItineraryBuilderProps) {
  
  const addDay = () => {
    const newDay: ItineraryDay = {
      id: `day-${Date.now()}`,
      day_number: days.length + 1,
      title: '',
      description: '',
      meals: '',
      stay_details: '',
      activities: ''
    };
    onChange([...days, newDay]);
  };

  const removeDay = (index: number) => {
    const newDays = [...days];
    newDays.splice(index, 1);
    // update day numbers
    newDays.forEach((day, i) => { day.day_number = i + 1; });
    onChange(newDays);
  };

  const updateDay = (index: number, field: keyof ItineraryDay, value: string) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], [field]: value };
    onChange(newDays);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(days);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    // update day numbers
    items.forEach((day, i) => { day.day_number = i + 1; });
    onChange(items);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manual Itinerary Builder</CardTitle>
          <CardDescription>Build a day-by-day itinerary with rich details.</CardDescription>
        </div>
        <Button onClick={addDay} variant="outline" size="sm" type="button">
          <Plus className="h-4 w-4 mr-2" />
          Add Day
        </Button>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="itinerary-days">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {days.map((day, index) => (
                  <Draggable key={day.id} draggableId={day.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="border rounded-lg p-4 bg-card shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-lg">Day {day.day_number}</h3>
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeDay(index)} type="button">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input 
                              placeholder="e.g. Arrival at Coorg & Local Sightseeing" 
                              value={day.title} 
                              onChange={(e) => updateDay(index, 'title', e.target.value)} 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea 
                              placeholder="Describe the day's events..." 
                              value={day.description} 
                              onChange={(e) => updateDay(index, 'description', e.target.value)} 
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Meals</Label>
                              <Input 
                                placeholder="Breakfast, Dinner" 
                                value={day.meals} 
                                onChange={(e) => updateDay(index, 'meals', e.target.value)} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Stay Details</Label>
                              <Input 
                                placeholder="Hotel Name / Type" 
                                value={day.stay_details} 
                                onChange={(e) => updateDay(index, 'stay_details', e.target.value)} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Activities</Label>
                              <Input 
                                placeholder="Trekking, Campfire" 
                                value={day.activities} 
                                onChange={(e) => updateDay(index, 'activities', e.target.value)} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        
        {days.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
            No itinerary days added yet. Click "Add Day" to begin.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
