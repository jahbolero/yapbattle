'use client';

import { useState } from 'react';
import type { DebateRoom, DebateMessage } from '@/types/debate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Copy, Check } from 'lucide-react';

interface ParsedAnalysis {
  winner: {
    name: string;
    player: string;
    score: string;
  };
  scores: {
    player1: {
      overall: number;
      breakdown: {
        logicalCoherence: number;
        evidence: number;
        relevance: number;
        counterarguments: number;
        feasibility: number;
        persuasiveness: number;
      };
    };
    player2: {
      overall: number;
      breakdown: {
        logicalCoherence: number;
        evidence: number;
        relevance: number;
        counterarguments: number;
        feasibility: number;
        persuasiveness: number;
      };
    };
  };
  debateSummary: string;
  pointsOfContention: string[];
  contentionAnalysis: {
    title: string;
    criteria: string;
    player1Analysis: string;
    player2Analysis: string;
    outcome: string;
  }[];
  holisticVerdict: string;
  aiInsights: string[];
  nextSteps: string[];
}

interface TestResult {
  success: boolean;
  room: {
    topic: string;
    player1: string;
    player2: string;
    messages: string[];
  };
  rawResponse: string;
  parsedAnalysis: ParsedAnalysis | null;
  winner: string;
  reason: string;
  winnerName: string;
}

interface TestError {
  error: string;
  details: string;
}

export default function IoTestPage() {
  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'analyzing' | 'complete'>('idle');
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<TestError | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Test debate data - mirrors the real debate structure
  const [testRoom] = useState<DebateRoom>({
    id: 'test-room',
    title: 'AI Debate Simulation',
    topic: "Should TechCorp expand internationally to Asia-Pacific markets now, or focus on consolidating domestic market share first?",
    rounds: 5,
    currentRound: 1,
    currentTurn: 'player1',
    status: 'waiting',
    player1: {
      id: 'test-player1',
      name: 'Marcus Chen (CEO)',
      isReady: true,
      joinedAt: new Date().toISOString()
    },
    player2: {
      id: 'test-player2', 
      name: 'Diana Rodriguez (CFO)',
      isReady: true,
      joinedAt: new Date().toISOString()
    },
    minutesPerTurn: 5,
    turnStartedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });





  // Pre-defined debate messages
  const debateMessages: DebateMessage[] = [
    {
      id: 'msg-1',
      content: "We need to strike while the iron is hot in the Asia-Pacific region. Our competitors are already establishing footholds in Singapore, Tokyo, and Sydney, and every quarter we delay costs us market share that will be exponentially harder to reclaim. The smartphone penetration rates in these markets have grown 340% in the past three years, creating an unprecedented window for our fintech solutions. Our Q3 revenue growth of 23% gives us the capital runway to fund international operations, and our cloud infrastructure can scale globally with minimal additional overhead costs.",
      user: { id: 'test-player1', name: 'Marcus Chen (CEO)' },
      round: 1,
      turn: 'player1',
      room: 'test-room',
      createdAt: new Date().toISOString()
    },
    {
      id: 'msg-2',
      content: "Marcus, that 23% growth is exactly why we should consolidate domestically first. We're sitting on a goldmine here - our customer acquisition cost has dropped 31% while lifetime value increased 45% in our core markets. Rushing into Asia-Pacific would require $12-15 million in upfront investments for regulatory compliance, localization, and market entry, plus ongoing operational costs of $2-3 million quarterly. Our domestic market penetration is only at 8% - we could realistically capture another 15-20% market share by doubling down on marketing and product development here, generating higher ROI with lower risk.",
      user: { id: 'test-player2', name: 'Diana Rodriguez (CFO)' },
      round: 1,
      turn: 'player2',
      room: 'test-room',
      createdAt: new Date().toISOString()
    },
    {
      id: 'msg-3',
      content: "Diana's numbers don't account for the velocity factor. Yes, domestic expansion is safer, but it's also saturated competition. We're fighting seven established players for scraps, while Asia-Pacific markets have 2-3 major competitors maximum. The regulatory hurdles she mentions are actually advantages - once we navigate them, they become barriers protecting us from new entrants. Singapore's fintech sandbox program offers expedited regulatory approval, and our partnerships with HSBC and Standard Chartered already give us banking infrastructure access. The $15 million investment will pay for itself within 18 months if we capture just 5% market share in three key cities.",
      user: { id: 'test-player1', name: 'Marcus Chen (CEO)' },
      round: 2,
      turn: 'player1',
      room: 'test-room',
      createdAt: new Date().toISOString()
    },
    {
      id: 'msg-4',
      content: "Marcus is romanticizing the opportunity while ignoring execution risks. Those 'partnerships' with HSBC and Standard Chartered are preliminary discussions, not signed contracts. Cultural localization alone will consume 6-8 months and require hiring 40-50 local employees per market. Our current team is already stretched thin managing our domestic growth trajectory - our customer support response times have increased 23% and our engineering velocity has slowed 15% due to technical debt. Spreading our resources across continents will dilute our core competency and potentially damage our domestic foundation, which still generates 89% of our revenue.",
      user: { id: 'test-player2', name: 'Diana Rodriguez (CFO)' },
      round: 2,
      turn: 'player2',
      room: 'test-room',
      createdAt: new Date().toISOString()
    },
    {
      id: 'msg-5',
      content: "Diana's missing the strategic chess game here. Our domestic competitors are also eyeing international expansion - if we don't move now, we'll face them in Asia-Pacific with their increased scale and resources in 12-18 months, making entry infinitely harder. The operational challenges she cites are solvable with proper planning and phased rollouts. We start with Singapore as a testing ground - English-speaking market, friendly regulatory environment, and serves as a gateway to Southeast Asia. The hiring concerns are valid, but we can leverage remote talent and establish regional offices gradually. Most importantly, international revenue streams provide crucial diversification against domestic economic volatility and regulatory changes.",
      user: { id: 'test-player1', name: 'Marcus Chen (CEO)' },
      round: 3,
      turn: 'player1',
      room: 'test-room',
      createdAt: new Date().toISOString()
    }
  ];

  const runSimulation = async () => {
    setSimulationState('running');
    setError(null);
    setResult(null);
    setCurrentMessageIndex(0);

    // Simulate debate progression
    for (let i = 0; i < debateMessages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between messages
      setCurrentMessageIndex(i + 1);
    }

    // Wait a moment, then start analysis
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSimulationState('analyzing');

    try {
      const response = await fetch('/api/io-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: testRoom.topic,
          player1: testRoom.player1?.name || 'Player 1',
          player2: testRoom.player2?.name || 'Player 2',
          messages: debateMessages.map(msg => `${msg.user.name}: ${msg.content}`)
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      setError({
        error: 'Network Error',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setSimulationState('complete');
    }
  };

  const resetSimulation = () => {
    setSimulationState('idle');
    setResult(null);
    setError(null);
    setCurrentMessageIndex(0);
  };

  const copyRoomLink = async () => {
    const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/io-test` : '';
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Create a room with the current status for display
  const displayRoom: DebateRoom = {
    ...testRoom,
    status: simulationState === 'running' || simulationState === 'analyzing' || simulationState === 'complete' ? 'active' : 'waiting'
  };

  // Get current messages to display
  const currentMessages = debateMessages.slice(0, currentMessageIndex);

  return (
    <div className="min-h-screen p-4 space-y-4">
      {/* Simulation Controls */}
      <div className="fixed top-4 right-4 z-50">
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              AI Debate Simulation
            </CardTitle>
            <CardDescription>
              Test the debate analysis system with pre-defined arguments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {simulationState === 'idle' && (
              <Button onClick={runSimulation} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Run Simulation
              </Button>
            )}

            {simulationState === 'running' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Simulating debate...</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Message {currentMessageIndex}/{debateMessages.length}
                </div>
              </div>
            )}

            {simulationState === 'analyzing' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">AI analyzing debate...</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  🤖 Processing arguments and determining winner
                </div>
              </div>
            )}

            {simulationState === 'complete' && (
              <div className="space-y-3">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm">
                    <p className="font-semibold text-destructive">{error.error}</p>
                    <p className="text-muted-foreground">{error.details}</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Winner:</span>
                      <Badge variant={result.winner === 'player1' ? 'default' : 'secondary'}>
                        {(() => {
                          const winnerMatch = result.rawResponse.match(/🏆 Winner: (.*?)(?:\n|$)/);
                          return winnerMatch?.[1] || result.winnerName;
                        })()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-xs font-medium">Score:</span>
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          const scoreMatch = result.rawResponse.match(/Score: (.*?)(?:\n|$)/);
                          return scoreMatch?.[1] || 'Analysis completed';
                        })()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-xs font-medium">Full Analysis:</span>
                      <div className="p-2 bg-muted rounded max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs">{result.rawResponse}</pre>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={resetSimulation} variant="outline" size="sm" className="w-full">
                  Reset Simulation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Room Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{displayRoom.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{displayRoom.topic}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                displayRoom.status === 'active' ? 'default' : 
                displayRoom.status === 'finished' ? 'destructive' : 
                'secondary'
              }>
                {displayRoom.status === 'finished' ? 'Debate Finished' : displayRoom.status}
              </Badge>
              <Button variant="outline" size="sm" onClick={copyRoomLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{displayRoom.currentRound}/{displayRoom.rounds}</div>
              <div className="text-sm text-muted-foreground">Round</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatTime(displayRoom.minutesPerTurn * 60)}</div>
              <div className="text-sm text-muted-foreground">Time Left</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{displayRoom.minutesPerTurn}m</div>
              <div className="text-sm text-muted-foreground">Per Turn</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{displayRoom.player1?.name || 'Waiting...'}</div>
                <div className="text-sm text-muted-foreground">Player 1</div>
              </div>
              <div className="flex items-center gap-2">
                {displayRoom.currentTurn === 'player1' && displayRoom.status === 'active' && (
                  <Badge variant="default">Your Turn</Badge>
                )}
                {displayRoom.player1?.isReady && (
                  <Badge variant="outline">Ready</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{displayRoom.player2?.name || 'Waiting...'}</div>
                <div className="text-sm text-muted-foreground">Player 2</div>
              </div>
              <div className="flex items-center gap-2">
                {displayRoom.currentTurn === 'player2' && displayRoom.status === 'active' && (
                  <Badge variant="default">Your Turn</Badge>
                )}
                {displayRoom.player2?.isReady && (
                  <Badge variant="outline">Ready</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debate Finished Message */}
      {simulationState === 'complete' && (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">🎉 Debate Complete!</h3>
            <p className="text-muted-foreground mb-4">
              The debate has finished after {displayRoom.rounds} rounds. 
              Thank you both for participating!
            </p>
            
                         {result && (
               <div className="mt-6 max-w-6xl mx-auto space-y-6">
                 {/* Winner Card */}
                 <div className="bg-white border border-gray-200 p-6 rounded-lg">
                   <div className="flex items-center justify-between">
                     <div>
                       <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Winner</div>
                       <h2 className="text-xl font-semibold text-gray-900">
                         {result.parsedAnalysis?.winner?.name || result.winnerName}
                       </h2>
                     </div>
                     <div className="text-right">
                       <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Score</div>
                       <div className="text-lg font-semibold text-gray-900">
                         {result.parsedAnalysis?.winner?.score || 'Analysis completed'}
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Debate Summary */}
                 {result.parsedAnalysis?.debateSummary && (
                   <div className="bg-white border border-gray-200 p-6 rounded-lg">
                     <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Debate Summary</div>
                     <p className="text-gray-900 leading-relaxed">{result.parsedAnalysis.debateSummary}</p>
                   </div>
                 )}

                 {/* Points of Contention */}
                 {result.parsedAnalysis?.pointsOfContention && result.parsedAnalysis.pointsOfContention.length > 0 && (
                   <div className="bg-white border border-gray-200 p-6 rounded-lg">
                     <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Points of Contention</div>
                     <div className="space-y-2">
                       {result.parsedAnalysis.pointsOfContention.map((contention, index) => (
                         <div key={index} className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                           <p className="text-gray-700 leading-relaxed">{contention}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Contention Analysis */}
                 {result.parsedAnalysis?.contentionAnalysis && result.parsedAnalysis.contentionAnalysis.length > 0 && (
                   <div className="space-y-6">
                     {/* Main Contention Analysis Header */}
                     <div className="bg-white border border-gray-200 p-6 rounded-lg">
                       <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contention Analysis</div>
                       <p className="text-sm text-gray-600 mt-2">Detailed breakdown of each major argument battleground</p>
                     </div>
                     
                     {/* Individual Contention Cards Grid */}
                     <div className="grid md:grid-cols-2 gap-4">
                       {result.parsedAnalysis.contentionAnalysis.map((contention, index) => (
                         <div key={index} className="bg-white border border-gray-200 p-5 rounded-lg">
                           <div className="flex items-start gap-3 mb-4">
                             <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                               {index + 1}
                             </div>
                             <div>
                               <h4 className="font-medium text-gray-900 text-sm">{contention.title}</h4>
                             </div>
                           </div>
                           
                           <div className="space-y-3 text-sm">
                             <div className="text-gray-700 leading-relaxed">
                               <strong>Criteria:</strong> {contention.criteria}
                             </div>
                             <div className="text-gray-700 leading-relaxed">
                               <strong>Marcus Chen (CEO):</strong> {contention.player1Analysis}
                             </div>
                             <div className="text-gray-700 leading-relaxed">
                               <strong>Diana Rodriguez (CFO):</strong> {contention.player2Analysis}
                             </div>
                             <div className="text-gray-700 leading-relaxed">
                               <strong>Outcome:</strong> {contention.outcome}
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Holistic Verdict */}
                 {result.parsedAnalysis?.holisticVerdict && (
                   <div className="bg-white border border-gray-200 p-6 rounded-lg">
                     <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Holistic Verdict</div>
                     <p className="text-gray-900 leading-relaxed">{result.parsedAnalysis.holisticVerdict}</p>
                   </div>
                 )}

                 {/* AI Insights & Recommendations */}
                 <div className="grid md:grid-cols-2 gap-6">
                   {/* AI Insights */}
                   {result.parsedAnalysis?.aiInsights && result.parsedAnalysis.aiInsights.length > 0 && (
                     <div className="bg-white border border-gray-200 p-6 rounded-lg">
                       <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">AI Insights</div>
                       <div className="space-y-2">
                         {result.parsedAnalysis.aiInsights.map((insight, index) => (
                           <div key={index} className="flex items-start gap-3">
                             <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                             <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Next Steps */}
                   {result.parsedAnalysis?.nextSteps && result.parsedAnalysis.nextSteps.length > 0 && (
                     <div className="bg-white border border-gray-200 p-6 rounded-lg">
                       <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Next Steps</div>
                       <div className="space-y-2">
                         {result.parsedAnalysis.nextSteps.map((step, index) => (
                           <div key={index} className="flex items-start gap-3">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                             <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Debate Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {currentMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.turn === 'player2' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    message.turn === 'player2'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {message.user.name} (Round {message.round})
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 