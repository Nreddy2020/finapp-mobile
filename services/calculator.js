export const CalculatorService = {
    // Calculate Hostel vs Commute comparison
    compare: (data) => {
        const {
            rent,
            food,
            utilities,
            commuteCost,
            commuteTimeMinutes, // Daily round trip
            hourlyRate, // Value of user's time (optional, default to min wage or 0)
        } = data;

        const monthlyRentCost = parseFloat(rent) + parseFloat(food) + parseFloat(utilities);

        const daysPerMonth = 22; // Working/College days
        const monthlyCommuteFare = parseFloat(commuteCost) * daysPerMonth;

        // Time is money logic
        const hoursLost = (parseFloat(commuteTimeMinutes) / 60) * daysPerMonth;
        const timeValue = hoursLost * (parseFloat(hourlyRate) || 100); // Default ₹100/hr value

        const totalCommuteCost = monthlyCommuteFare + timeValue;

        const savings = Math.abs(monthlyRentCost - totalCommuteCost);
        const recommendation = monthlyRentCost < totalCommuteCost ? 'HOSTEL' : 'COMMUTE';

        return {
            monthlyRentCost,
            monthlyCommuteFare,
            timeValue,
            totalCommuteCost,
            savings,
            recommendation
        };
    }
};
