import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, DollarSign, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Competition {
  id: string;
  title: string;
  description: string;
  subject: string;
  start_time: string;
  end_time: string;
  prize_pool: number;
  entry_fee: number;
  max_participants: number;
  status: string;
  is_premium: boolean;
}

interface CompetitionBrowserProps {
  onBack: () => void;
}

export const CompetitionBrowser = ({ onBack }: CompetitionBrowserProps) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompetitions();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('competition-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitions'
        },
        () => {
          fetchCompetitions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load competitions",
          variant: "destructive",
        });
        return;
      }

      setCompetitions(data || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompetition = (competitionId: string) => {
    toast({
      title: "Coming Soon",
      description: "Competition joining functionality will be available soon!",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'active': return 'secondary';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold">Competitions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h2 className="text-2xl font-bold">Study Competitions</h2>
      </div>

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {competitions.map(competition => (
          <Card key={competition.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{competition.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={getStatusColor(competition.status)}>
                      {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                    </Badge>
                    {competition.is_premium && (
                      <Badge variant="secondary">
                        <Trophy className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                    {competition.subject && (
                      <Badge variant="outline">{competition.subject}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardDescription>{competition.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Start</p>
                      <p className="text-muted-foreground">{formatDate(competition.start_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">End</p>
                      <p className="text-muted-foreground">{formatDate(competition.end_time)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  {competition.prize_pool > 0 && (
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-medium">${competition.prize_pool} Prize Pool</span>
                    </div>
                  )}
                  {competition.max_participants && (
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Max {competition.max_participants} participants</span>
                    </div>
                  )}
                </div>

                {competition.entry_fee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Entry Fee:</span>
                    <span className="font-medium">${competition.entry_fee}</span>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={() => handleJoinCompetition(competition.id)}
                  disabled={competition.status === 'completed'}
                >
                  {competition.status === 'upcoming' ? 'Join Competition' : 
                   competition.status === 'active' ? 'Enter Now' : 'Completed'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {competitions.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No competitions available</h3>
          <p className="text-muted-foreground">
            Check back later for exciting study competitions!
          </p>
        </div>
      )}
    </div>
  );
};