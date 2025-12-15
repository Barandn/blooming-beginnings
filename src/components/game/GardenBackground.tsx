import gardenBg from "@/assets/garden-background.png";

const GardenBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100" />

      {/* Soft blurred color spots */}
      <div className="absolute -top-24 -right-10 w-72 h-72 bg-accent/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-16 -left-10 w-80 h-80 bg-primary/15 blur-3xl rounded-full" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-secondary/10 blur-3xl rounded-full" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.4) 0, transparent 30%), radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.35) 0, transparent 25%), radial-gradient(circle at 40% 80%, rgba(245, 158, 11, 0.3) 0, transparent 35%)",
        }}
      />

      {/* Textured base image for depth */}
      <img
        src={gardenBg}
        alt="Garden background"
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-60"
      />

      {/* Glass gradient overlay for modern feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-emerald-50/30 backdrop-blur-[2px]" />
    </div>
  );
};

export default GardenBackground;
