'use client';

import { useState, useRef, useEffect } from 'react';
import type { DebateRoom, DebateMessage } from '@/types/debate';
import { Button } from '@/components/ui/button';
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
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when current messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentMessageIndex]);

  // Fake progress bar for AI analysis
  useEffect(() => {
    if (simulationState === 'analyzing') {
      setAnalysisProgress(0);
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) {
            return prev; // Stop at 95% to never complete
          }
          // Start fast, then slow down
          const remaining = 95 - prev;
          const increment = Math.max(0.5, remaining * 0.02);
          return Math.min(95, prev + increment);
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setAnalysisProgress(0);
    }
  }, [simulationState]);

  // Create a room with the current status for display
  const displayRoom: DebateRoom = {
    ...testRoom,
    status: simulationState === 'running' || simulationState === 'analyzing' || simulationState === 'complete' ? 'active' : 'waiting'
  };

  // Get current messages to display
  const currentMessages = debateMessages.slice(0, currentMessageIndex);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      {/* Simulation Controls */}
      <div className="fixed top-6 right-6 z-50">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-purple-200/50 w-80">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Play className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Debate Simulation</h3>
              <p className="text-sm text-gray-600">Test the debate analysis system</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {simulationState === 'idle' && (
              <Button onClick={runSimulation} className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg transform transition-all duration-200 hover:scale-105">
                <Play className="h-4 w-4 mr-2" />
                Run Simulation
              </Button>
            )}

            {simulationState === 'running' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  <span className="text-sm font-medium text-gray-700">Simulating debate...</span>
                </div>
                <div className="text-xs text-gray-600">
                  Message {currentMessageIndex}/{debateMessages.length}
                </div>
              </div>
            )}

            {simulationState === 'analyzing' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  <span className="text-sm font-medium text-gray-700">AI analyzing debate...</span>
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  🤖 Processing arguments and determining winner
                </div>
                <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 ease-out"
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 text-center">
                  {Math.round(analysisProgress)}% complete
                </p>
              </div>
            )}

            {simulationState === 'complete' && (
              <div className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
                    <p className="font-semibold text-red-700">{error.error}</p>
                    <p className="text-red-600 mt-1">{error.details}</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">Winner:</span>
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full">
                        {(() => {
                          const winnerMatch = result.rawResponse.match(/🏆 Winner: (.*?)(?:\n|$)/);
                          return winnerMatch?.[1] || result.winnerName;
                        })()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-700">Score:</span>
                      <div className="text-xs text-gray-600">
                        {(() => {
                          const scoreMatch = result.rawResponse.match(/Score: (.*?)(?:\n|$)/);
                          return scoreMatch?.[1] || 'Analysis completed';
                        })()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-gray-700">Full Analysis:</span>
                      <div className="p-3 bg-gray-50 rounded-xl max-h-32 overflow-y-auto border border-gray-200">
                        <pre className="whitespace-pre-wrap text-xs text-gray-700">{result.rawResponse}</pre>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={resetSimulation} variant="outline" size="sm" className="w-full rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium">
                  Reset Simulation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl border border-purple-200/50">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">{displayRoom.title}</h1>
            <p className="text-gray-700 text-lg">{displayRoom.topic}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={
              displayRoom.status === 'active' ? 'default' : 
              displayRoom.status === 'finished' ? 'destructive' : 
              'secondary'
            } className="px-4 py-2 rounded-xl font-medium">
              {displayRoom.status === 'finished' ? 'Debate Finished' : displayRoom.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={copyRoomLink} className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mt-8 text-center">
          <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6 border border-purple-300/50">
            <div className="text-3xl font-bold text-purple-700">{displayRoom.currentRound}/{displayRoom.rounds}</div>
            <div className="text-sm text-purple-600 mt-2 font-medium">Round</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-6 border border-indigo-300/50">
            <div className="text-3xl font-bold text-indigo-700">{formatTime(displayRoom.minutesPerTurn * 60)}</div>
            <div className="text-sm text-indigo-600 mt-2 font-medium">Time Left</div>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 border border-blue-300/50">
            <div className="text-3xl font-bold text-blue-700">{displayRoom.minutesPerTurn}m</div>
            <div className="text-sm text-blue-600 mt-2 font-medium">Per Turn</div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {(displayRoom.player1?.name || 'P1').charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">
                  {displayRoom.player1?.name || 'Waiting...'}
                </div>
                <div className="text-sm text-gray-700">Player 1</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {displayRoom.currentTurn === 'player1' && displayRoom.status === 'active' && (
                <Badge variant="default" className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl">Your Turn</Badge>
              )}
              {displayRoom.player1?.isReady && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 px-4 py-2 rounded-xl">Ready</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {(displayRoom.player2?.name || 'P2').charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">
                  {displayRoom.player2?.name || 'Waiting...'}
                </div>
                <div className="text-sm text-gray-700">Player 2</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {displayRoom.currentTurn === 'player2' && displayRoom.status === 'active' && (
                <Badge variant="default" className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl">Your Turn</Badge>
              )}
              {displayRoom.player2?.isReady && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 px-4 py-2 rounded-xl">Ready</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Debate Finished Message */}
      {simulationState === 'complete' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl border border-purple-200/50 text-center">
          <h3 className="text-xl font-semibold mb-3 text-gray-900">🎉 Debate Complete!</h3>
          <p className="text-gray-700 mb-6">
            The debate has finished after {displayRoom.rounds} rounds. 
            Thank you both for participating!
          </p>
          
          {result && (
            <div className="mt-8 max-w-6xl mx-auto space-y-6">
              {/* Winner Card */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-purple-100 uppercase tracking-wide mb-2">Winner</div>
                    <h2 className="text-2xl font-semibold">
                      {result.parsedAnalysis?.winner?.name || result.winnerName}
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-purple-100 uppercase tracking-wide mb-2">Score</div>
                    <div className="text-xl font-semibold">
                      {result.parsedAnalysis?.winner?.score || 'Analysis completed'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Debate Summary */}
              {result.parsedAnalysis?.debateSummary && (
                <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-4">Debate Summary</div>
                  <p className="text-gray-900 leading-relaxed">{result.parsedAnalysis.debateSummary}</p>
                </div>
              )}

              {/* Points of Contention */}
              {result.parsedAnalysis?.pointsOfContention && result.parsedAnalysis.pointsOfContention.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-6">Points of Contention</div>
                  <div className="space-y-4">
                    {result.parsedAnalysis.pointsOfContention.map((contention, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-800 leading-relaxed">{contention}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contention Analysis */}
              {result.parsedAnalysis?.contentionAnalysis && result.parsedAnalysis.contentionAnalysis.length > 0 && (
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Contention Analysis</div>
                    <p className="text-sm text-gray-700 mt-3">Detailed breakdown of each major argument battleground</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {result.parsedAnalysis.contentionAnalysis.map((contention, index) => (
                      <div key={index} className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-start gap-4 mb-6">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 text-base">{contention.title}</h4>
                          </div>
                        </div>
                        
                        <div className="space-y-4 text-sm">
                          <div className="text-gray-800 leading-relaxed">
                            <strong>Criteria:</strong> {contention.criteria}
                          </div>
                          <div className="text-gray-800 leading-relaxed">
                            <strong>Marcus Chen (CEO):</strong> {contention.player1Analysis}
                          </div>
                          <div className="text-gray-800 leading-relaxed">
                            <strong>Diana Rodriguez (CFO):</strong> {contention.player2Analysis}
                          </div>
                          <div className="text-gray-800 leading-relaxed">
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
                <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-4">Holistic Verdict</div>
                  <p className="text-gray-900 leading-relaxed">{result.parsedAnalysis.holisticVerdict}</p>
                </div>
              )}

              {/* AI Insights & Recommendations */}
              <div className="grid md:grid-cols-2 gap-6">
                {result.parsedAnalysis?.aiInsights && result.parsedAnalysis.aiInsights.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-6">AI Insights</div>
                    <div className="space-y-4">
                      {result.parsedAnalysis.aiInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-800 leading-relaxed">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.parsedAnalysis?.nextSteps && result.parsedAnalysis.nextSteps.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-6">Next Steps</div>
                    <div className="space-y-4">
                      {result.parsedAnalysis.nextSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-800 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-200/50">
        <h3 className="text-xl font-semibold mb-6 text-gray-900">Debate Messages</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {currentMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.turn === 'player2' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl ${
                  message.turn === 'player2'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                    : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-purple-200/50 shadow-lg'
                }`}
              >
                <div className="text-xs font-medium mb-2">
                  {message.user.name} (Round {message.round})
                </div>
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
} 