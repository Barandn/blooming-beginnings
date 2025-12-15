const GardenBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky via-sky-light to-grass-light" />
      
      {/* Clouds */}
      <div className="absolute top-8 left-4 text-5xl opacity-80">☁️</div>
      <div className="absolute top-12 right-8 text-4xl opacity-70">☁️</div>
      <div className="absolute top-20 left-1/2 text-3xl opacity-60">☁️</div>
      
      {/* Trees on sides */}
      <div className="absolute top-16 -left-8 text-8xl">🌳</div>
      <div className="absolute top-24 -right-6 text-7xl">🌲</div>
      <div className="absolute top-40 -left-4 text-6xl">🌲</div>
      <div className="absolute top-48 -right-4 text-5xl">🌳</div>
      
      {/* Grass layer */}
      <div className="absolute bottom-20 left-0 right-0 h-40 bg-gradient-to-t from-grass to-grass-light" />
      
      {/* Decorative flowers */}
      <div className="absolute bottom-32 left-4 text-2xl">🌷</div>
      <div className="absolute bottom-36 left-12 text-xl">🌸</div>
      <div className="absolute bottom-28 right-6 text-2xl">🌻</div>
      <div className="absolute bottom-34 right-14 text-xl">🌺</div>
      <div className="absolute bottom-40 left-1/4 text-lg">🦋</div>
      
      {/* Bench decoration */}
      <div className="absolute top-1/3 right-4 text-3xl">🪑</div>
    </div>
  );
};

export default GardenBackground;
