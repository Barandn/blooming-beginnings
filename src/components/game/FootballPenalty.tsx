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
    const [targetPosition, setTargetPosition] = useState<Position | null>(null);
    const [dragStart, setDragStart] = useState<Position | null>(null);
    const [dragCurrent, setDragCurrent] = useState<Position | null>(null);
    const [goalkeeperPosition, setGoalkeeperPosition] = useState(50); // 0-100 horizontal
    const [goalkeeperDiving, setGoalkeeperDiving] = useState<"left" | "right" | "center" | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    // Calculate level (1-20)
    const level = Math.floor((distance - 10) / 10) + 1;

    // Goal scale decreases dramatically with distance
    // At level 1 (10m): scale = 1.0
    // At level 20 (200m): scale = 0.15
    const goalScale = Math.max(0.15, 1 - (level - 1) * 0.045);

    // Goal position moves up (further away) with distance
    const goalTopPosition = 15 + (level - 1) * 0.5;

    // Reset ball position
    const resetBall = useCallback(() => {
        setBallPosition({ x: 50, y: 85 });
        setTargetPosition(null);
        setDragStart(null);
        setDragCurrent(null);
        setGoalkeeperDiving(null);
        setGoalkeeperPosition(50);
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
        const currentPos = getEventPosition(e);
        setDragCurrent(currentPos);
    }, [gameState, dragStart, getEventPosition]);

    // Handle drag end - shoot the ball
    const handleDragEnd = useCallback(() => {
        if (gameState !== "aiming" || !dragStart || !dragCurrent) return;

        // Ball goes TO where you dragged (direct direction)
        const targetX = dragCurrent.x;
        const targetY = dragCurrent.y;

        // Check if dragged upward (toward goal)
        if (targetY >= dragStart.y - 5) {
            // Not enough upward motion, cancel
            setGameState("ready");
            setDragStart(null);
            setDragCurrent(null);
            return;
        }

        setGameState("shooting");

        // Calculate where the ball will end up (toward goal area)
        // The ball should fly toward where you aimed
        const goalY = goalTopPosition + 5; // Goal line Y position

        // Calculate trajectory - ball goes to where finger pointed
        const finalX = Math.max(5, Math.min(95, targetX));

        // Set target for animation
        setTargetPosition({ x: finalX, y: goalY });
        setBallPosition({ x: finalX, y: goalY });

        // Goalkeeper decides where to dive
        // Higher levels = smarter goalkeeper (more likely to guess right)
        const gkSmartness = 0.2 + (level * 0.03); // 23% at level 1, 80% at level 20
        const gkGuessesRight = Math.random() < gkSmartness;

        let diveDirection: "left" | "right" | "center";
        if (gkGuessesRight) {
            // Goalkeeper guesses correctly
            if (finalX < 40) diveDirection = "left";
            else if (finalX > 60) diveDirection = "right";
            else diveDirection = "center";
        } else {
            // Goalkeeper guesses wrong
            const wrongDirections: ("left" | "right" | "center")[] = [];
            if (finalX >= 40) wrongDirections.push("left");
            if (finalX <= 60) wrongDirections.push("right");
            if (finalX < 40 || finalX > 60) wrongDirections.push("center");
            diveDirection = wrongDirections[Math.floor(Math.random() * wrongDirections.length)] || "center";
        }

        setGoalkeeperDiving(diveDirection);

        // Move goalkeeper
        const gkTargetX = diveDirection === "left" ? 25 : diveDirection === "right" ? 75 : 50;
        setGoalkeeperPosition(gkTargetX);

        // Check result after animation
        setTimeout(() => {
            // Goal boundaries (narrower as distance increases)
            const goalWidth = 40 * goalScale;
            const goalLeft = 50 - goalWidth / 2;
            const goalRight = 50 + goalWidth / 2;

            // Check if ball is in goal area
            const isInGoal = finalX >= goalLeft && finalX <= goalRight;

            if (!isInGoal) {
                // Missed the goal entirely
                setGameState("missed");
                return;
            }

            // Check if goalkeeper saves
            // Goalkeeper catch range depends on where they dove
            const gkCatchWidth = 18 * goalScale; // Catch width scales with goal size
            const gkCatchLeft = gkTargetX - gkCatchWidth / 2;
            const gkCatchRight = gkTargetX + gkCatchWidth / 2;

            const isSaved = finalX >= gkCatchLeft && finalX <= gkCatchRight;

            if (isSaved) {
                setGameState("saved");
            } else {
                setGameState("scored");
                setShowConfetti(true);
                setScore((s) => s + 1);
                setTimeout(() => setShowConfetti(false), 2000);
            }
        }, 800);
    }, [gameState, dragStart, dragCurrent, goalScale, goalTopPosition, level]);

    // Continue after scoring
    const handleContinue = useCallback(() => {
        if (distance >= 200) {
            // Max distance reached - victory!
            setDistance(10);
            setScore(0);
        } else {
            setDistance((d) => Math.min(200, d + 10));
        }
        setGameState("ready");
        resetBall();
    }, [distance, resetBall]);

    // Restart game
    const handleRestart = useCallback(() => {
        setDistance(10);
        setScore(0);
        setGameState("ready");
        resetBall();
    }, [resetBall]);

    // Draw aim line (shows where ball will go)
    const getAimLine = () => {
        if (!dragStart || !dragCurrent || gameState !== "aiming") return null;

        // Line from ball to where you're dragging
        const dx = dragCurrent.x - ballPosition.x;
        const dy = dragCurrent.y - ballPosition.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
            <>
                {/* Aim line */}
                <div
                    className="absolute pointer-events-none origin-left"
                    style={{
                        left: `${ballPosition.x}%`,
                        top: `${ballPosition.y}%`,
                        width: `${length}%`,
                        height: '3px',
                        background: `linear-gradient(to right, rgba(255,255,0,0.8), rgba(255,255,0,0.3))`,
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: 'left center',
                    }}
                />
                {/* Target indicator */}
                <div
                    className="absolute pointer-events-none w-6 h-6 -translate-x-1/2 -translate-y-1/2 border-2 border-yellow-400 rounded-full animate-ping"
                    style={{
                        left: `${dragCurrent.x}%`,
                        top: `${dragCurrent.y}%`,
                    }}
                />
                <div
                    className="absolute pointer-events-none w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 rounded-full"
                    style={{
                        left: `${dragCurrent.x}%`,
                        top: `${dragCurrent.y}%`,
                    }}
                />
            </>
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
                    <p className="text-2xl font-bold text-white">{level}/20</p>
                </div>
            </div>

            {/* Difficulty indicator */}
            <div className="mb-3 bg-black/20 rounded-full h-2 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-500"
                    style={{ width: `${(level / 20) * 100}%` }}
                />
            </div>

            {/* Game Area */}
            <div
                ref={gameAreaRef}
                className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-gradient-to-b from-green-700 via-green-600 to-green-500 select-none touch-none shadow-2xl"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
            >
                {/* Sky background at top */}
                <div
                    className="absolute left-0 right-0 top-0 bg-gradient-to-b from-sky-400 to-transparent"
                    style={{ height: `${goalTopPosition + 15}%` }}
                />

                {/* Field lines */}
                <div className="absolute inset-0">
                    {/* Penalty area - scales with distance */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 border-2 border-white/30 rounded-sm"
                        style={{
                            top: `${goalTopPosition - 2}%`,
                            width: `${70 * goalScale}%`,
                            height: `${25 * goalScale}%`,
                        }}
                    />
                    {/* Penalty spot */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-white/50 rounded-full"
                        style={{ top: '80%' }}
                    />
                </div>

                {/* Goal */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 transition-all duration-500"
                    style={{
                        top: `${goalTopPosition}%`,
                        width: `${55 * goalScale}%`,
                        height: `${18 * goalScale}%`,
                        minWidth: '60px',
                        minHeight: '25px',
                    }}
                >
                    {/* Goal posts */}
                    <div className="absolute inset-0 border-4 border-white rounded-t-lg shadow-lg" />
                    {/* Crossbar */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-white rounded-t-lg" />
                    {/* Left post */}
                    <div className="absolute top-0 bottom-0 left-0 w-2 bg-white" />
                    {/* Right post */}
                    <div className="absolute top-0 bottom-0 right-0 w-2 bg-white" />
                    {/* Net */}
                    <div
                        className="absolute inset-1 bg-black/40 rounded-t"
                        style={{
                            backgroundImage: `
                linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px),
                linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)
              `,
                            backgroundSize: `${Math.max(4, 8 * goalScale)}px ${Math.max(4, 8 * goalScale)}px`,
                        }}
                    />

                    {/* Goalkeeper */}
                    <div
                        className={cn(
                            "absolute bottom-0 transition-all duration-300 ease-out",
                            goalkeeperDiving === "left" && "animate-pulse",
                            goalkeeperDiving === "right" && "animate-pulse"
                        )}
                        style={{
                            left: `${goalkeeperPosition}%`,
                            transform: `translateX(-50%) ${goalkeeperDiving === "left" ? "translateX(-30%) rotate(-15deg)" : goalkeeperDiving === "right" ? "translateX(30%) rotate(15deg)" : ""}`,
                            width: `${Math.max(20, 30 * goalScale)}%`,
                            minWidth: '18px',
                        }}
                    >
                        <div className="relative" style={{ height: `${Math.max(30, 50 * goalScale)}px` }}>
                            {/* Body */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-3/4 bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-t-full shadow-md" />
                            {/* Head */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 aspect-square bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-full shadow-sm" />
                            {/* Arms (when diving) */}
                            {goalkeeperDiving && goalkeeperDiving !== "center" && (
                                <div
                                    className={cn(
                                        "absolute top-1/3 w-full h-1/4 bg-yellow-400 rounded-full",
                                        goalkeeperDiving === "left" ? "-left-full" : "-right-full"
                                    )}
                                />
                            )}
                            {/* Gloves */}
                            <div className="absolute top-1/3 -left-1 w-2 h-2 bg-orange-500 rounded-full" />
                            <div className="absolute top-1/3 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Ball */}
                <div
                    className={cn(
                        "absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20",
                        gameState === "shooting" ? "transition-all duration-700 ease-out" : "transition-all duration-100"
                    )}
                    style={{
                        left: `${ballPosition.x}%`,
                        top: `${ballPosition.y}%`,
                        transform: `translate(-50%, -50%) scale(${gameState === "shooting" ? 0.3 + goalScale * 0.4 : 1})`,
                    }}
                >
                    <div className="w-full h-full text-5xl flex items-center justify-center drop-shadow-xl select-none">
                        ⚽
                    </div>
                </div>

                {/* Aim Line */}
                {getAimLine()}

                {/* Result Overlays */}
                {gameState === "scored" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/40 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                        <div className="text-center p-6 bg-black/30 rounded-3xl backdrop-blur-md">
                            <div className="text-7xl mb-4">⚽🥅</div>
                            <h2 className="text-5xl font-black text-white drop-shadow-lg">GOAL!</h2>
                            <p className="text-white/90 mt-2 text-lg">From {distance}m away!</p>
                            <button
                                onClick={handleContinue}
                                className="mt-6 px-10 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-lg rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
                            >
                                {distance >= 200 ? "🏆 CHAMPION!" : `Next: ${distance + 10}m →`}
                            </button>
                        </div>
                    </div>
                )}

                {gameState === "missed" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/40 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                        <div className="text-center p-6 bg-black/30 rounded-3xl backdrop-blur-md">
                            <div className="text-7xl mb-4">😢</div>
                            <h2 className="text-5xl font-black text-white drop-shadow-lg">MISSED!</h2>
                            <p className="text-white/90 mt-2 text-lg">The ball went wide...</p>
                            <p className="text-white/70 text-sm mt-1">You scored {score} goals!</p>
                            <button
                                onClick={handleRestart}
                                className="mt-6 px-10 py-4 bg-gradient-to-r from-red-400 to-rose-500 text-white font-bold text-lg rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
                            >
                                🔄 Try Again
                            </button>
                        </div>
                    </div>
                )}

                {gameState === "saved" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-orange-500/40 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                        <div className="text-center p-6 bg-black/30 rounded-3xl backdrop-blur-md">
                            <div className="text-7xl mb-4">🧤</div>
                            <h2 className="text-5xl font-black text-white drop-shadow-lg">SAVED!</h2>
                            <p className="text-white/90 mt-2 text-lg">The goalkeeper caught it!</p>
                            <p className="text-white/70 text-sm mt-1">You scored {score} goals!</p>
                            <button
                                onClick={handleRestart}
                                className="mt-6 px-10 py-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold text-lg rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
                            >
                                🔄 Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            {gameState === "ready" && (
                <div className="text-center mt-4">
                    <p className="text-green-200 text-sm animate-pulse">
                        👆 Tap the ball, drag to aim at the goal, and release!
                    </p>
                    <p className="text-green-200/50 text-xs mt-1">
                        Level {level}: Goal is {Math.round(55 * goalScale)}% size
                    </p>
                </div>
            )}

            {gameState === "aiming" && (
                <p className="text-center text-yellow-300 text-sm mt-4 font-bold animate-bounce">
                    🎯 Release to shoot!
                </p>
            )}
        </div>
    );
};

export default FootballPenalty;
