import { ChevronLeft, ChevronRight } from "lucide-react";
import { TICKER_DATA } from "@/data/funds";

const TickerTape = () => {
  const items = [...TICKER_DATA, ...TICKER_DATA];

  return (
    <div className="h-8 bg-nav border-b border-nav-hover overflow-hidden flex items-center relative z-[70]">
      <button className="absolute left-0 z-10 h-full px-1.5 bg-nav border-r border-nav-foreground/10 hover:bg-nav-hover transition-colors">
        <ChevronLeft className="w-3.5 h-3.5 text-nav-foreground/50" />
      </button>
      <div className="flex animate-ticker whitespace-nowrap ml-8 mr-8">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-4 text-xs">
            <span className="font-medium text-nav-foreground tracking-tight">{item.name}</span>
            <span className="text-nav-foreground">{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className={`${item.isPositive ? 'text-positive' : 'text-negative'}`}>
              {item.isPositive ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
      <button className="absolute right-0 z-10 h-full px-1.5 bg-nav border-l border-nav-foreground/10 hover:bg-nav-hover transition-colors">
        <ChevronRight className="w-3.5 h-3.5 text-nav-foreground/50" />
      </button>
    </div>
  );
};

export default TickerTape;
