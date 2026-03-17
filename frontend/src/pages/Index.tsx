import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import FilterSidebar from "@/components/FilterSidebar";
import FundTable from "@/components/FundTable";

const Index = () => {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TickerTape />
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <FilterSidebar />
        <FundTable />
      </div>
    </div>
  );
};

export default Index;
