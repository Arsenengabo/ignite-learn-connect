import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CompetitionCreator = () => {
  const [competition, setCompetition] = useState({
    title: "",
    description: "",
    subject: "",
    startTime: "",
    endTime: "",
    maxParticipants: 100,
    entryFee: 0,
    prizePool: 0,
    status: "upcoming",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Please log in to create a competition");
        return;
      }

      if (!competition.title.trim() || !competition.startTime || !competition.endTime) {
        toast.error("Please fill in all required fields");
        return;
      }

      if (new Date(competition.startTime) >= new Date(competition.endTime)) {
        toast.error("End time must be after start time");
        return;
      }

      const { error } = await supabase
        .from('competitions')
        .insert({
          title: competition.title,
          description: competition.description,
          subject: competition.subject,
          start_time: competition.startTime,
          end_time: competition.endTime,
          max_participants: competition.maxParticipants,
          entry_fee: competition.entryFee,
          prize_pool: competition.prizePool,
          status: competition.status,
          organizer_id: user.user.id,
        });

      if (error) throw error;

      toast.success("Competition created successfully!");
      
      // Reset form
      setCompetition({
        title: "",
        description: "",
        subject: "",
        startTime: "",
        endTime: "",
        maxParticipants: 100,
        entryFee: 0,
        prizePool: 0,
        status: "upcoming",
      });
    } catch (error) {
      console.error('Error creating competition:', error);
      toast.error("Failed to create competition");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Create Competition
        </CardTitle>
        <CardDescription>
          Organize study competitions to engage students across different schools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Competition Title *</Label>
              <Input
                id="title"
                value={competition.title}
                onChange={(e) => setCompetition({ ...competition, title: e.target.value })}
                placeholder="e.g., National Math Championship"
                required
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select onValueChange={(value) => setCompetition({ ...competition, subject: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  <SelectItem value="geography">Geography</SelectItem>
                  <SelectItem value="general">General Knowledge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={competition.description}
              onChange={(e) => setCompetition({ ...competition, description: e.target.value })}
              placeholder="Describe the competition format, rules, and objectives"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Date & Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formatDateTime(competition.startTime)}
                onChange={(e) => setCompetition({ ...competition, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Date & Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formatDateTime(competition.endTime)}
                onChange={(e) => setCompetition({ ...competition, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={competition.maxParticipants}
                  onChange={(e) => setCompetition({ ...competition, maxParticipants: parseInt(e.target.value) })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="entryFee">Entry Fee ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="entryFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={competition.entryFee}
                  onChange={(e) => setCompetition({ ...competition, entryFee: parseFloat(e.target.value) })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="prizePool">Prize Pool ($)</Label>
              <div className="relative">
                <Trophy className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="prizePool"
                  type="number"
                  min="0"
                  step="0.01"
                  value={competition.prizePool}
                  onChange={(e) => setCompetition({ ...competition, prizePool: parseFloat(e.target.value) })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Competition Preview</Label>
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{competition.title || "Competition Title"}</h3>
                <Badge variant="secondary">{competition.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {competition.description || "Competition description will appear here"}
              </p>
              <div className="flex flex-wrap gap-2">
                {competition.subject && (
                  <Badge variant="outline">{competition.subject}</Badge>
                )}
                <Badge variant="outline">
                  <Users className="w-3 h-3 mr-1" />
                  Max {competition.maxParticipants}
                </Badge>
                {competition.prizePool > 0 && (
                  <Badge variant="outline" className="text-accent">
                    <Trophy className="w-3 h-3 mr-1" />
                    ${competition.prizePool}
                  </Badge>
                )}
                {competition.entryFee > 0 && (
                  <Badge variant="outline">
                    ${competition.entryFee} entry
                  </Badge>
                )}
              </div>
              {competition.startTime && competition.endTime && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(competition.startTime).toLocaleDateString()} - {new Date(competition.endTime).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating..." : "Create Competition"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};