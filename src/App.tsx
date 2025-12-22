
import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Market } from './components/Market';
import { Pot } from './components/Pot';
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function GameHeader() {
  const { state, collectDailyBonus, resetGame, watchAd } = useGame();

  return (
    <header className="flex flex-col md:flex-row justify-between items-center p-4 bg-primary text-primary-foreground shadow-md sticky top-0 z-10">
      <div className="flex items-center gap-2 mb-4 md:mb-0">
        <span className="text-2xl">🌻</span>
        <h1 className="text-xl font-bold">Grand Master Flower Farm</h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-xs opacity-80">Diamonds</span>
            <span className="font-bold text-lg flex items-center gap-1">
              {state.diamonds} 💎
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs opacity-80">B&G</span>
            <span className="font-bold text-lg flex items-center gap-1">
              {state.bg} 🪙
            </span>
          </div>
        </div>

        {state.diamonds === 0 && (
            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 animate-pulse" onClick={() => {
                // Mock ad watch
                toast.promise(
                    new Promise(resolve => setTimeout(resolve, 3000)),
                    {
                        loading: 'Watching Ad...',
                        success: () => {
                           watchAd();
                           return "Thanks for watching! +1 💎";
                        },
                        error: 'Ad failed',
                    }
                );
            }}>
            📺 Watch Ad (+1 💎)
            </Button>
        )}
        <Button variant="secondary" size="sm" onClick={collectDailyBonus}>
          Daily Bonus
        </Button>
        <Button variant="destructive" size="sm" onClick={() => {
            if(confirm("Are you sure you want to reset everything?")) resetGame();
        }}>
          Reset
        </Button>
      </div>
    </header>
  );
}

function Farm() {
  const { state } = useGame();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {state.plots.map(plot => (
        <Pot key={plot.id} plotId={plot.id} />
      ))}
    </div>
  );
}

function Leaderboard() {
  // Mock data as per spec
  const mockLeaderboard = [
    { rank: 1, name: "FloraMaster99", profit: 5400 },
    { rank: 2, name: "GreenThumb", profit: 4200 },
    { rank: 3, name: "DaisyDuke", profit: 3800 },
    { rank: 4, name: "You", profit: 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Diamond Profit</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockLeaderboard.map((user) => (
            <div key={user.rank} className={`flex justify-between items-center p-3 rounded-lg ${user.rank <= 3 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <span className={`font-bold w-6 text-center ${user.rank === 1 ? 'text-yellow-600' : ''}`}>#{user.rank}</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <span className="font-bold text-blue-600">{user.profit} 💎</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GameContent() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Tabs defaultValue="farm" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="farm">My Farm</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="farm" className="space-y-4">
           <Farm />
        </TabsContent>

        <TabsContent value="market">
          <Market />
        </TabsContent>

        <TabsContent value="leaderboard">
          <Leaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-background font-sans text-foreground">
        <GameHeader />
        <GameContent />
        <Toaster />
      </div>
    </GameProvider>
  );
}
