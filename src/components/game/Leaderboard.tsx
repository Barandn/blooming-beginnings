import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, TrendingUp } from "lucide-react";
import { useGame } from "@/context/GameContext";

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_LEADERBOARD = [
  { rank: 1, name: "FloraMaster99", profit: 12500 },
  { rank: 2, name: "GreenThumb_X", profit: 9800 },
  { rank: 3, name: "RoseQueen", profit: 8400 },
  { rank: 4, name: "DaisyDuke", profit: 5200 },
  { rank: 5, name: "PetalPusher", profit: 3100 },
];

const Leaderboard = ({ isOpen, onClose }: LeaderboardProps) => {
  const { state } = useGame();

  // Insert current user into the list for comparison (simple logic)
  const userEntry = { rank: 99, name: "YOU", profit: state.monthlyProfit };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl text-amber-800">
            <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Top Farmers
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
            <div className="flex justify-between items-center px-4 py-2 bg-amber-50 rounded-lg mb-4 border border-amber-100">
                <span className="font-bold text-amber-900">Your Monthly Profit:</span>
                <div className="flex items-center gap-1 font-mono text-lg font-bold text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    {state.monthlyProfit} 💎
                </div>
            </div>

            <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                    {MOCK_LEADERBOARD.map((user) => (
                        <div key={user.rank} className={`flex items-center justify-between p-3 rounded-lg border ${user.rank <= 3 ? "bg-gradient-to-r from-yellow-50 to-white border-yellow-200" : "bg-white border-gray-100"}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                    user.rank === 1 ? "bg-yellow-400 text-yellow-900" :
                                    user.rank === 2 ? "bg-gray-300 text-gray-800" :
                                    user.rank === 3 ? "bg-amber-600 text-amber-100" :
                                    "bg-gray-100 text-gray-500"
                                }`}>
                                    {user.rank}
                                </div>
                                <span className={`font-medium ${user.rank <= 3 ? "text-amber-900" : "text-gray-700"}`}>
                                    {user.name}
                                </span>
                            </div>
                            <span className="font-bold text-green-600">
                                {user.profit} 💎
                            </span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Leaderboard;
