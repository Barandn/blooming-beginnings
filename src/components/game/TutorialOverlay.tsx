import React from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";

const TutorialOverlay = () => {
  const { state, setTutorialStep } = useGame();
  const { tutorialStep } = state;

  if (tutorialStep === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dimmed Background */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Step 1: Point to Market */}
      {tutorialStep === 1 && (
        <div className="absolute bottom-24 right-1/4 animate-bounce">
            <div className="bg-white p-4 rounded-lg shadow-xl relative pointer-events-auto">
                <p className="font-bold mb-2">Tohum Al!</p>
                <p className="text-sm">Başlamak için Pazara git.</p>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
            </div>
            <div className="text-6xl text-center mt-2">👇</div>
        </div>
      )}

      {/* Step 2: Point to Wheat Seed */}
      {tutorialStep === 2 && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto text-center">
              <div className="bg-white p-6 rounded-xl shadow-2xl animate-pulse">
                  <h2 className="text-xl font-bold mb-2">Hoş Geldin Çiftçi!</h2>
                  <p>Başlangıç için 50 Elmas hediye!</p>
                  <p className="font-bold text-amber-600 mt-2">Bir Buğday Tohumu Al!</p>
              </div>
          </div>
      )}

      {/* Step 3: Point to Empty Plot */}
      {tutorialStep === 3 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce">
            <div className="text-6xl text-center mb-2">👇</div>
            <div className="bg-white p-4 rounded-lg shadow-xl relative pointer-events-auto">
                <p className="font-bold">Ek tohumu!</p>
                <p className="text-sm">Boş bir tarlaya dokun.</p>
            </div>
        </div>
      )}

      {/* Skip Button */}
      <div className="absolute top-4 right-4 pointer-events-auto">
          <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => setTutorialStep(0)}>
              Geç
          </Button>
      </div>
    </div>
  );
};

export default TutorialOverlay;
