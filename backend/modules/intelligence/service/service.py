from ..models import SimulationResult
import asyncio

class IntelligenceService:
    @staticmethod
    async def simulate_market_shock(scenario: str, user_id: str) -> SimulationResult:
        # Simulate AI Calculation Delay (for UX "Thinking" effect)
        await asyncio.sleep(1.5)
        
        # 1. Fetch User Business Data (Mocking for now as we don't have a full Business Module yet)
        # In a real app, await BusinessService.get_portfolio(user_id)
        
        base_revenue = 1250000.0 # 12.5L
        base_profit = 845000.0   # ~67% margin
        
        scenario = scenario.upper()
        
        if scenario == "RECESSION":
            # -20% Revenue, +High Stress
            proj_revenue = base_revenue * 0.8
            proj_profit = base_profit * 0.8 
            trend = "-20.0%"
            stress = "HIGH"
            
        elif scenario == "BOOM":
            # +30% Revenue, Low Stress
            proj_revenue = base_revenue * 1.3
            proj_profit = base_profit * 1.3
            trend = "+30.0%"
            stress = "LOW"
        else:
            # Default/Neutral
            proj_revenue = base_revenue
            proj_profit = base_profit
            trend = "0.0%"
            stress = "NORMAL"

        # Formatting helpers
        def fmt_lakh(val):
            return f"₹{val/100000:.1f}L"
            
        def fmt_money(val):
            # Format with indian locale approximation or just standard commas
            # 10,98,500 format is Indian style (Lakhs)
            # Python standard is 1,098,500. 
            # For hackathon/MVP, standard comma is fine.
            return f"₹{val:,.0f}"

        return SimulationResult(
            scenario=scenario,
            revenue=fmt_lakh(proj_revenue),
            profit=fmt_money(proj_profit),
            trend=trend,
            stress=stress
        )
