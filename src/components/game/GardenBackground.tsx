import gardenBg from "@/assets/garden-background.png";

const GardenBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <img 
        src={gardenBg} 
        alt="Garden background" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default GardenBackground;
