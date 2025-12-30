import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Market from "./pages/Market";
import Barn from "./pages/Barn";
import NotFound from "./pages/NotFound";
import { GameProvider } from "./context/GameContext";
import { MiniKitProvider } from "./components/MiniKitProvider";

const queryClient = new QueryClient();

const App = () => (
  <MiniKitProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <GameProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/market" element={<Market />} />
              <Route path="/barn" element={<Barn />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </MiniKitProvider>
);

export default App;
