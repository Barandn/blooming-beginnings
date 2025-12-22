
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { FLOWER_TYPES, ECONOMY } from '../data/gameData';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface PotProps {
  plotId: string;
}

export function Pot({ plotId }: PotProps) {
  const { state, plantSeed, waterPlant, fertilizePlant, harvestPlant, clearDeadPlant } = useGame();
  const plot = state.plots.find(p => p.id === plotId);
  const plant = plot?.plant;
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [status, setStatus] = useState<'healthy' | 'thirsty' | 'dead' | 'ready'>('healthy');
  const [selectedSeed, setSelectedSeed] = useState<string>("");

  useEffect(() => {
    if (!plant || plant.isDead || plant.isHarvestable) return;

    const updateStatus = () => {
      const species = FLOWER_TYPES.find(s => s.id === plant.speciesId)!;
      const now = Date.now();
      const timeSinceWatered = (now - plant.lastWateredAt) / (1000 * 60 * 60); // Hours

      const healthyLimit = species.wateringInterval;
      const deathLimit = species.wateringInterval + plant.gracePeriodHours;

      if (timeSinceWatered > deathLimit) {
        setStatus('dead');
        setTimeLeft("Withered");
      } else if (timeSinceWatered > healthyLimit) {
        setStatus('thirsty');
        // Calculate remaining grace period
        const remainingGrace = deathLimit - timeSinceWatered;
        const hours = Math.floor(remainingGrace);
        const minutes = Math.floor((remainingGrace - hours) * 60);
        setTimeLeft(`${hours}h ${minutes}m (Grace!)`);
      } else {
        setStatus('healthy');
         // Calculate time until thirsty
        const remainingHealthy = healthyLimit - timeSinceWatered;
        const hours = Math.floor(remainingHealthy);
        const minutes = Math.floor((remainingHealthy - hours) * 60);
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [plant]);

  if (!plant) {
    const availableSeeds = Object.entries(state.inventory).filter(([_, count]) => count > 0);

    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center min-h-[250px] bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
        <div className="text-4xl mb-4 opacity-50">🪴</div>
        <h3 className="font-semibold mb-2">Empty Pot</h3>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Plant Seed</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Plant a Seed</DialogTitle>
              <DialogDescription>Select a seed from your inventory to plant.</DialogDescription>
            </DialogHeader>
            <Select onValueChange={setSelectedSeed}>
              <SelectTrigger>
                <SelectValue placeholder="Select seed" />
              </SelectTrigger>
              <SelectContent>
                {availableSeeds.length > 0 ? (
                  availableSeeds.map(([id, count]) => {
                    const species = FLOWER_TYPES.find(s => s.id === id);
                    return (
                      <SelectItem key={id} value={id}>
                        {species?.icon} {species?.name} (x{count})
                      </SelectItem>
                    );
                  })
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No seeds in inventory. Buy some in the Market!</div>
                )}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button onClick={() => {
                if(selectedSeed) plantSeed(plotId, selectedSeed);
              }} disabled={!selectedSeed}>Plant</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const species = FLOWER_TYPES.find(s => s.id === plant.speciesId)!;

  if (plant.isDead) {
    return (
      <div className="border-2 border-red-200 bg-red-50 rounded-lg p-6 flex flex-col items-center justify-center min-h-[250px]">
        <div className="text-5xl mb-4 grayscale filter">🥀</div>
        <h3 className="font-bold text-red-600 mb-2">Withered {species.name}</h3>
        <p className="text-xs text-center text-red-500 mb-4">Neglected for too long.</p>
        <Button variant="destructive" onClick={() => clearDeadPlant(plotId)}>
          Clear Dead Plant (+{species.seedCost} 💎 Refund)
        </Button>
      </div>
    );
  }

  if (plant.isHarvestable) {
    return (
      <div className="border-2 border-yellow-400 bg-yellow-50 rounded-lg p-6 flex flex-col items-center justify-center min-h-[250px] animate-pulse">
        <div className="text-6xl mb-4 animate-bounce">{species.icon}</div>
        <h3 className="font-bold text-yellow-700 mb-2">Ready to Harvest!</h3>
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => harvestPlant(plotId)}>
          Harvest (+{species.seedCost * ECONOMY.HARVEST_DIAMOND_MULTIPLIER} 💎)
        </Button>
      </div>
    );
  }

  // Growing State
  const progress = (plant.waterCount / plant.totalCyclesNeeded) * 100;

  return (
    <div className={`border-2 rounded-lg p-4 flex flex-col gap-3 min-h-[250px] relative overflow-hidden transition-all ${
      status === 'thirsty' ? 'border-red-400 bg-red-50' : 'border-green-200 bg-green-50'
    }`}>
      <div className="flex justify-between items-start">
        <Badge variant="outline" className="bg-white">{species.name}</Badge>
        <div className="text-xs font-mono text-gray-500">
           {status === 'thirsty' && <span className="animate-pulse text-red-600 font-bold">THIRSTY! </span>}
           {timeLeft}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className={`text-5xl transition-all ${status === 'thirsty' ? 'scale-95 opacity-80' : 'scale-100'}`}>
          {species.icon}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Growth Progress</span>
          <span>{plant.waterCount} / {plant.totalCyclesNeeded} cycles</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <Dialog>
           <DialogTrigger asChild>
             <Button
                variant={status === 'thirsty' ? "destructive" : "default"}
                className="w-full text-xs"
                disabled={status === 'healthy' && !plant.isHarvestable} // Disable if healthy (Wait for cycle)? Spec says "User taps Pot B... Water needed"
                // Actually spec says "Visual Scan: Pot A: Green (Healthy). Pot B: Red (Thirsty). Action - Watering: User taps Pot B"
                // This implies you might not be able to water Pot A?
                // Or maybe you can "top up"? The spec says "Watering Interval: 24 Hours".
                // Usually in these games you can only water when it needs it.
                // I will enable it only if thirsty OR if near thirsty?
                // Actually, let's strictly follow: "Action - Watering: User taps Pot B."
             >
               💧 Water (1💎)
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Water Plant</DialogTitle>
               <DialogDescription>
                 Watering costs {ECONOMY.WATER_COST} Diamond.
                 It will reset the 24h timer and add 1 to the growth cycle.
               </DialogDescription>
             </DialogHeader>
             <DialogFooter>
               <Button onClick={() => {
                   waterPlant(plotId);
               }}>Confirm (-{ECONOMY.WATER_COST} 💎)</Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>

        <Dialog>
           <DialogTrigger asChild>
             <Button variant="secondary" className="w-full text-xs text-yellow-700 bg-yellow-100 hover:bg-yellow-200">
               🧪 Boost
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Add Fertilizer</DialogTitle>
               <DialogDescription>
                 Cost: {ECONOMY.FERTILIZER_COST} B&G.
                 Reduces required water cycles by 25%.
                 Current needed: {plant.totalCyclesNeeded}.
               </DialogDescription>
             </DialogHeader>
             <DialogFooter>
               <Button onClick={() => fertilizePlant(plotId)} disabled={state.bg < ECONOMY.FERTILIZER_COST}>
                 Use Fertilizer (-{ECONOMY.FERTILIZER_COST} B&G)
               </Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
