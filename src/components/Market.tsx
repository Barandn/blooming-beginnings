
import React from 'react';
import { useGame } from '../context/GameContext';
import { FLOWER_TYPES, ECONOMY } from '../data/gameData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Market() {
  const { state, buySeed } = useGame();

  return (
    <div className="p-4 bg-background rounded-lg border shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Marketplace</h2>
      <Tabs defaultValue="seeds" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="essentials">Essentials</TabsTrigger>
          <TabsTrigger value="seeds">Seeds</TabsTrigger>
        </TabsList>

        <TabsContent value="essentials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Water</CardTitle>
                <CardDescription>Essential for plant survival.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl mb-2">💧</div>
                <p>Cost: <span className="font-bold text-blue-500">{ECONOMY.WATER_COST} 💎</span> / use</p>
                <p className="text-sm text-muted-foreground mt-2">Paid directly at the pot when watering.</p>
              </CardContent>
              <CardFooter>
                <Button disabled className="w-full">Auto-deducted on use</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fertilizer</CardTitle>
                <CardDescription>Boosts growth efficiency.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl mb-2">🧪</div>
                <p>Cost: <span className="font-bold text-yellow-600">{ECONOMY.FERTILIZER_COST} B&G</span> / use</p>
                <p className="text-sm text-muted-foreground mt-2">Reduces watering cycles needed by {ECONOMY.FERTILIZER_EFFICIENCY * 100}%.</p>
              </CardContent>
               <CardFooter>
                <Button disabled className="w-full">Auto-deducted on use</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seeds">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {FLOWER_TYPES.map((flower) => (
              <Card key={flower.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{flower.icon}</span>
                      {flower.name}
                    </CardTitle>
                    <Badge variant={flower.difficulty === 'Easy' ? 'secondary' : flower.difficulty === 'Medium' ? 'default' : 'destructive'}>
                      {flower.difficulty}
                    </Badge>
                  </div>
                  <CardDescription>{flower.specialTrait}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-bold text-blue-500">{flower.seedCost} 💎</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cycles:</span>
                    <span>{flower.waterCycles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interval:</span>
                    <span>{flower.wateringInterval}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grace Period:</span>
                    <span>{flower.gracePeriodMin}-{flower.gracePeriodMax}h</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => buySeed(flower.id)}
                    className="w-full"
                    disabled={state.diamonds < flower.seedCost}
                  >
                    Buy Seed ({flower.seedCost} 💎)
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
