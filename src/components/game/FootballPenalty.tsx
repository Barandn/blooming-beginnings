import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

// Game state types
type GameState = "ready" | "aiming" | "shooting" | "scored" | "missed" | "saved";

interface Position {
    x: number;
    y: number;
}

// Confetti component
const Confetti = () => {
    const pieces = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1}s`,
        duration: `${1.5 + Math.random() * 1}s`,
        color: ['#fbbf24', '#22c55e', '#3b82f6', '#ef4444'][Math.floor(Math.random() * 4)],
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="confetti"
                    style={{
                        left: piece.left,
                        animationDelay: piece.delay,
                        animationDuration: piece.duration,
                        backgroundColor: piece.color,
                        width: '10px',
                        height: '10px',
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    }}
                />
            ))}
        </div>
    );
};

const FootballPenalty = () => {
    const [gameState, setGameState] = useState<GameState>("ready");
    const [distance, setDistance] = useState(10); // Starting at 10 meters
    const [score, setScore] = useState(0);
    const [ballPosition, setBallPosition] = useState<Position>({ x: 50, y: 85 });
    const [dragStart, setDragStart] = useState<Position | null>(null);
    const [dragCurrent, setDragCurrent] = useState<Position | null>(null);
    const [goalkeeperPosition, setGoalkeeperPosition] = useState(50); // 0-100 horizontal
    const [showConfetti, setShowConfetti] = useState(false);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    // Calculate goalkeeper size and goal size based on distance
    const goalScale = Math.max(0.3, 1 - (distance - 10) / 250);
    const goalkeeperScale = goalScale * 0.9;

    // Reset ball position
    const resetBall = useCallback(() => {
        setBallPosition({ x: 50, y: 85 });
        setDragStart(null);
        setDragCurrent(null);
    }, []);

    // Get position from event (touch or mouse)
    const getEventPosition = useCallback((e: React.TouchEvent | React.MouseEvent): Position => {
        const rect = gameAreaRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        let clientX: number, clientY: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100,
        };
    }, []);

    // Handle drag start
    const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (gameState !== "ready") return;
        e.preventDefault();
        const pos = getEventPosition(e);
        // Only allow dragging from near the ball
        const distToBall = Math.sqrt(
            Math.pow(pos.x - ballPosition.x, 2) + Math.pow(pos.y - ballPosition.y, 2)
        );
        if (distToBall < 15) {
            setDragStart(pos);
            setDragCurrent(pos);
            setGameState("aiming");
        }
    }, [gameState, ballPosition, getEventPosition]);

    // Handle drag move
    const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (gameState !== "aiming" || !dragStart) return;
        e.preventDefault();
        setDragCurrent(getEventPosition(e));
    }, [gameState, dragStart, getEventPosition]);

    // Handle drag end - shoot the ball
    const handleDragEnd = useCallback(() => {
        if (gameState !== "aiming" || !dragStart || !dragCurrent) return;

        // Calculate velocity based on drag direction (inverted - drag back to shoot forward)
        const velocityX = (dragStart.x - dragCurrent.x) * 0.5;
        const velocityY = (dragStart.y - dragCurrent.y) * 0.8;

        // Only shoot if there's enough power
        if (Math.abs(velocityY) < 5) {
            setGameState("ready");
            setDragStart(null);
            setDragCurrent(null);
            return;
        }

        setGameState("shooting");

        // Random goalkeeper dive direction (weighted towards center)
        const gkDiveDirection = Math.random() > 0.5 ? 1 : -1;
        const gkDiveAmount = 20 + Math.random() * 25;
        const newGkPosition = 50 + (gkDiveDirection * gkDiveAmount);
        setGoalkeeperPosition(Math.max(10, Math.min(90, newGkPosition)));

        // Calculate final ball position
        const targetX = 50 + velocityX;
        const targetY = 25; // Goal line position

        // Animate ball
        const clampedX = Math.max(15, Math.min(85, targetX));
        setBallPosition({ x: clampedX, y: targetY });

        // Check result after animation
        setTimeout(() => {
            // Goal boundaries (narrower as distance increases)
            const goalWidth = 35 * goalScale;
            const goalLeft = 50 - goalWidth / 2;
            const goalRight = 50 + goalWidth / 2;

            // Check if ball is in goal area
            const isInGoal = clampedX >= goalLeft && clampedX <= goalRight;

            // Check if goalkeeper saves (based on position overlap)
            const gkWidth = 12 * goalkeeperScale;
            const gkLeft = newGkPosition - gkWidth / 2;
            const gkRight = newGkPosition + gkWidth / 2;
            const isSaved = clampedX >= gkLeft && clampedX <= gkRight && isInGoal;

            // Determine outcome (difficulty increases with distance)
            const saveProbability = 0.15 + (distance / 400); // 15% base + distance bonus
            const randomSave = Math.random() < saveProbability;

            if (!isInGoal) {
                setGameState("missed");
            } else if (isSaved || randomSave) {
                setGameState("saved");
            } else {
                setGameState("scored");
                setShowConfetti(true);
                setScore((s) => s + 1);
                setTimeout(() => setShowConfetti(false), 2000);
            }
        }, 800);
    }, [gameState, dragStart, dragCurrent, goalScale, goalkeeperScale, distance]);

    // Continue after scoring
    const handleContinue = useCallback(() => {
        if (distance >= 200) {
            // Max distance reached - could show victory screen
            setDistance(10);
            setScore(0);
        } else {
            setDistance((d) => Math.min(200, d + 10));
        }
        setGameState("ready");
        setGoalkeeperPosition(50);
        resetBall();
    }, [distance, resetBall]);

    // Restart game
    const handleRestart = useCallback(() => {
        setDistance(10);
        setScore(0);
        setGameState("ready");
        setGoalkeeperPosition(50);
        resetBall();
    }, [resetBall]);

    // Draw aim line
    const getAimLine = () => {
        if (!dragStart || !dragCurrent || gameState !== "aiming") return null;
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        const power = Math.min(100, Math.sqrt(dx * dx + dy * dy) * 2);

        return (
            <div
                className="absolute pointer-events-none"
                style={{
                    left: `${ballPosition.x}%`,
                    top: `${ballPosition.y}%`,
                    width: '2px',
                    height: `${power}px`,
                    background: `linear-gradient(to top, rgba(255,255,255,0.8), rgba(255,255,255,0.2))`,
                    transform: `rotate(${Math.atan2(-dx, -dy) * (180 / Math.PI)}deg)`,
                    transformOrigin: 'bottom center',
                }}
            />
        );
    };

    return (
        <div className="w-full max-w-md mx-auto px-4 py-6">
            {showConfetti && <Confetti />}

            {/* Stats Header */}
            <div className="flex justify-between items-center mb-4 p-4 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10">
                <div className="text-center">
                    <p className="text-xs text-green-200 uppercase tracking-wider">Distance</p>
                    <p className="text-2xl font-bold text-white">{distance}m</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center">
                    <p className="text-xs text-green-200 uppercase tracking-wider">Goals</p>
                    <p className="text-2xl font-bold text-white">{score}</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center">
                    <p className="text-xs text-green-200 uppercase tracking-wider">Level</p>
                    <p className="text-2xl font-bold text-white">{Math.floor((distance - 10) / 10) + 1}/20</p>
                </div>
            </div>

            {/* Game Area */}
            <div
                ref={gameAreaRef}
                className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-gradient-to-b from-green-600 via-green-500 to-green-400 select-none touch-none"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
            >
                {/* Field lines */}
                <div className="absolute inset-0">
                    {/* Penalty area */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 border-2 border-white/40 rounded-sm"
                        style={{
                            top: `${15 - 5 * goalScale}%`,
                            width: `${60 * goalScale}%`,
                            height: `${20 * goalScale}%`,
                        }}
                    />
                    {/* Center line */}
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/20" />
                    {/* Center circle */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full" />
                </div>

                {/* Goal */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 transition-all duration-300"
                    style={{
                        top: `${20 - 5 * goalScale}%`,
                        width: `${50 * goalScale}%`,
                        height: `${15 * goalScale}%`,
                    }}
                >
                    {/* Goal frame */}
                    <div className="absolute inset-0 border-4 border-white rounded-t-lg bg-black/20" />
                    {/* Net pattern */}
                    <div className="absolute inset-1 opacity-30"
                        style={{
                            backgroundImage: `
                linear-gradient(90deg, white 1px, transparent 1px),
                linear-gradient(white 1px, transparent 1px)
              `,
                            backgroundSize: '8px 8px',
                        }}
                    />

                    {/* Goalkeeper */}
                    <div
                        className="absolute bottom-0 transition-all duration-500 ease-out"
                        style={{
                            left: `${goalkeeperPosition}%`,
                            transform: 'translateX(-50%)',
                            width: `${25 * goalkeeperScale}%`,
                            minWidth: '20px',
                        }}
                    >
                        <div className="relative">
                            {/* Body */}
                            <div className="w-full aspect-[1/2] bg-yellow-400 rounded-t-full shadow-lg" />
                            {/* Head */}
                            <div
                                className="absolute -top-2 left-1/2 -translate-x-1/2 w-3/4 aspect-square bg-yellow-300 rounded-full"
                                style={{ minWidth: '10px' }}
                            />
                            {/* Arms (when diving) */}
                            {gameState === "shooting" && (
                                <div
                                    className={cn(
                                        "absolute top-1/4 w-full h-1/3 bg-yellow-400 rounded-full transition-all duration-300",
                                        goalkeeperPosition > 50 ? "-right-1/2" : "-left-1/2"
                                    )}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Ball */}
                <div
                    className={cn(
                        "absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 transition-all cursor-grab active:cursor-grabbing",
                        gameState === "shooting" ? "duration-700 ease-out" : "duration-100"
                    )}
                    style={{
                        left: `${ballPosition.x}%`,
                        top: `${ballPosition.y}%`,
                        transform: `translate(-50%, -50%) scale(${gameState === "shooting" ? 0.5 + goalScale * 0.3 : 1})`,
                    }}
                >
                    <div className="w-full h-full text-4xl flex items-center justify-center drop-shadow-lg select-none">
                        ⚽
                    </div>
                </div>

                {/* Aim Line */}
                {getAimLine()}

                {/* Result Overlays */}
                {gameState === "scored" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="text-center">
                            <div className="text-6xl mb-4">⚽🥅</div>
                            <h2 className="text-4xl font-black text-white drop-shadow-lg">GOAL!</h2>
                            <p className="text-white/80 mt-2">From {distance}m away!</p>
                            <button
                                onClick={handleContinue}
                                className="mt-6 px-8 py-3 bg-white text-green-600 font-bold rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
                            >
                                {distance >= 200 ? "🏆 You Win!" : `Next: ${distance + 10}m →`}
                            </button>
                        </div>
                    </div>
                )}

                {gameState === "missed" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/30 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="text-center">
                            <div className="text-6xl mb-4">😢</div>
                            <h2 className="text-4xl font-black text-white drop-shadow-lg">MISSED!</h2>
                            <p className="text-white/80 mt-2">The ball went wide...</p>
                            <button
                                onClick={handleRestart}
                                className="mt-6 px-8 py-3 bg-white text-red-600 font-bold rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
                            >
                                🔄 Try Again
                            </button>
                        </div>
                    </div>
                )}

                {gameState === "saved" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-orange-500/30 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🧤</div>
                            <h2 className="text-4xl font-black text-white drop-shadow-lg">SAVED!</h2>
                            <p className="text-white/80 mt-2">The goalkeeper caught it!</p>
                            <button
                                onClick={handleRestart}
                                className="mt-6 px-8 py-3 bg-white text-orange-600 font-bold rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
                            >
                                🔄 Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            {gameState === "ready" && (
                <p className="text-center text-green-200/60 text-sm mt-4 animate-pulse">
                    👆 Drag the ball backwards and release to shoot!
                </p>
            )}

            {gameState === "aiming" && (
                <p className="text-center text-yellow-200 text-sm mt-4 font-bold">
                    🎯 Aim and release to shoot!
                </p>
            )}
        </div>
    );
};

export default FootballPenalty;
