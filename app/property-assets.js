import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Home, Wrench, PiggyBank, Calculator, FileText, CheckCircle, Percent } from 'lucide-react-native';

export default function PropertyAssets() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('maintenance');

    // Maintenance Tracking State
    const [maintenanceCost, setMaintenanceCost] = useState('');
    const [maintenanceType, setMaintenanceType] = useState('');
    const [maintenanceLogs, setMaintenanceLogs] = useState([]);

    // Repair Fund State
    const [repairGoal, setRepairGoal] = useState('');
    const [savedAmount, setSavedAmount] = useState('');

    // Rent vs EMI State
    const [currentRent, setCurrentRent] = useState('');
    const [propertyPrice, setPropertyPrice] = useState('');
    const [downPayment, setDownPayment] = useState('');
    const [emiResult, setEmiResult] = useState(null);

    // Home Loan Eligibility State
    const [monthlyIncome, setMonthlyIncome] = useState('');
    const [existingEmi, setExistingEmi] = useState('');
    const [eligibilityResult, setEligibilityResult] = useState(null);

    // Rent Receipt State
    const [tenantName, setTenantName] = useState('');
    const [receiptMonth, setReceiptMonth] = useState('');
    const [receiptGenerated, setReceiptGenerated] = useState(false);

    const generateReceipt = () => {
        if (!tenantName || !currentRent || !receiptMonth) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        setReceiptGenerated(true);
    };

    const addMaintenanceLog = () => {
        if (!maintenanceCost || !maintenanceType) {
            Alert.alert('Error', 'Please enter cost and type');
            return;
        }
        const newLog = {
            id: Date.now().toString(),
            type: maintenanceType,
            cost: parseFloat(maintenanceCost),
            date: new Date().toLocaleDateString(),
        };
        setMaintenanceLogs([newLog, ...maintenanceLogs]);
        setMaintenanceCost('');
        setMaintenanceType('');
        Alert.alert('Success', 'Maintenance log added');
    };

    const calculateRentVsEmi = () => {
        if (!propertyPrice || !downPayment || !currentRent) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        const loanAmount = parseFloat(propertyPrice) - parseFloat(downPayment);
        const interestRate = 8.5; // Approx home loan rate
        const tenureYears = 20;
        const monthlyRate = interestRate / (12 * 100);
        const months = tenureYears * 12;

        // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
        const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

        setEmiResult({
            emi: emi.toFixed(0),
            rentGap: (emi - parseFloat(currentRent)).toFixed(0),
            advice: emi > parseFloat(currentRent) * 1.5
                ? "Renting is financially safer right now."
                : "Buying might be a good option if you have stable income."
        });
    };

    const checkEligibility = () => {
        if (!monthlyIncome) {
            return;
        }
        const income = parseFloat(monthlyIncome);
        const obligations = parseFloat(existingEmi) || 0;
        const maxEmi = income * 0.5; // Banks usually allow 50% of income for EMIs
        const availableEmi = maxEmi - obligations;

        // Reverse calc loan amount from EMI (approx)
        // Assuming 20 years, 8.5%
        const interestRate = 8.5;
        const monthlyRate = interestRate / (12 * 100);
        const months = 240;

        // Loan = EMI * ((1+r)^n - 1) / (r * (1+r)^n)
        const maxLoan = availableEmi * (Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, months));

        setEligibilityResult({
            maxLoan: maxLoan > 0 ? maxLoan.toFixed(0) : 0,
            status: availableEmi > 5000 ? "Eligible" : "Low Eligibility"
        });
    };

    const renderMaintenance = () => (
        <View className="space-y-4">
            <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <Text className="text-lg font-semibold text-gray-800 mb-2">Log Maintenance</Text>
                <TextInput
                    placeholder="Type (e.g., Plumbing, Paint)"
                    value={maintenanceType}
                    onChangeText={setMaintenanceType}
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TextInput
                    placeholder="Cost (₹)"
                    value={maintenanceCost}
                    onChangeText={setMaintenanceCost}
                    keyboardType="numeric"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TouchableOpacity
                    onPress={addMaintenanceLog}
                    className="bg-blue-600 p-3 rounded-lg items-center"
                >
                    <Text className="text-white font-semibold">Add Log</Text>
                </TouchableOpacity>
            </View>

            <View className="space-y-2">
                <Text className="text-gray-600 font-medium">Recent Logs</Text>
                {maintenanceLogs.map(log => (
                    <View key={log.id} className="bg-white p-3 rounded-lg flex-row justify-between items-center border border-gray-100">
                        <View>
                            <Text className="font-medium text-gray-800">{log.type}</Text>
                            <Text className="text-xs text-gray-500">{log.date}</Text>
                        </View>
                        <Text className="text-red-500 font-semibold">-₹{log.cost}</Text>
                    </View>
                ))}
                {maintenanceLogs.length === 0 && (
                    <Text className="text-gray-400 italic text-center py-4">No maintenance records yet.</Text>
                )}
            </View>
        </View>
    );

    const renderPlanning = () => (
        <View className="space-y-6">
            <View className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <Text className="text-lg font-semibold text-purple-900 mb-2">Repair Fund Goal</Text>
                <TextInput
                    placeholder="Target Amount (₹)"
                    value={repairGoal}
                    onChangeText={setRepairGoal}
                    keyboardType="numeric"
                    className="bg-white p-3 rounded-lg border border-purple-200 mb-3"
                />
                <TextInput
                    placeholder="Currently Saved (₹)"
                    value={savedAmount}
                    onChangeText={setSavedAmount}
                    keyboardType="numeric"
                    className="bg-white p-3 rounded-lg border border-purple-200 mb-3"
                />
                <View className="h-2 bg-purple-200 rounded-full overflow-hidden mt-2">
                    <View
                        className="h-full bg-purple-600"
                        style={{
                            width: `${Math.min(100, (parseFloat(savedAmount || 0) / parseFloat(repairGoal || 1)) * 100)}%`
                        }}
                    />
                </View>
                <Text className="text-right text-xs text-purple-700 mt-1">
                    {Math.round((parseFloat(savedAmount || 0) / parseFloat(repairGoal || 1)) * 100)}% Funded
                </Text>
            </View>

            <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Rent vs Buy Calculator</Text>
                <TextInput
                    placeholder="Current Monthly Rent (₹)"
                    value={currentRent}
                    onChangeText={setCurrentRent}
                    keyboardType="numeric"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TextInput
                    placeholder="Property Price (₹)"
                    value={propertyPrice}
                    onChangeText={setPropertyPrice}
                    keyboardType="numeric"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TextInput
                    placeholder="Down Payment Available (₹)"
                    value={downPayment}
                    onChangeText={setDownPayment}
                    keyboardType="numeric"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TouchableOpacity
                    onPress={calculateRentVsEmi}
                    className="bg-indigo-600 p-3 rounded-lg items-center mb-4"
                >
                    <Text className="text-white font-semibold">Compare</Text>
                </TouchableOpacity>

                {emiResult && (
                    <View className="bg-indigo-50 p-3 rounded-lg">
                        <Text className="text-indigo-900 font-medium">Estimated EMI: ₹{emiResult.emi}</Text>
                        <Text className="text-indigo-700 text-sm mt-1">
                            You would pay ₹{emiResult.rentGap} more than rent.
                        </Text>
                        <Text className="text-indigo-800 font-bold mt-2 text-center">{emiResult.advice}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    const renderLoans = () => (
        <View className="space-y-6">
            <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Home Loan Eligibility</Text>
                <TextInput
                    placeholder="Monthly Income (₹)"
                    value={monthlyIncome}
                    onChangeText={setMonthlyIncome}
                    keyboardType="numeric"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TextInput
                    placeholder="Current EMIs (₹)"
                    value={existingEmi}
                    onChangeText={setExistingEmi}
                    keyboardType="numeric"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TouchableOpacity
                    onPress={checkEligibility}
                    className="bg-emerald-600 p-3 rounded-lg items-center"
                >
                    <Text className="text-white font-semibold">Check Eligibility</Text>
                </TouchableOpacity>

                {eligibilityResult && (
                    <View className="mt-4 items-center">
                        <View className={`w-16 h-16 rounded-full items-center justify-center mb-2 ${eligibilityResult.status === 'Eligible' ? 'bg-emerald-100' : 'bg-orange-100'
                            }`}>
                            {eligibilityResult.status === 'Eligible' ? (
                                <CheckCircle size={32} color="#059669" />
                            ) : (
                                <Percent size={32} color="#ea580c" />
                            )}
                        </View>
                        <Text className="text-xl font-bold text-gray-900">₹{eligibilityResult.maxLoan}</Text>
                        <Text className="text-sm text-gray-500">Maximum Loan Amount</Text>
                        <Text className={`font-medium mt-1 ${eligibilityResult.status === 'Eligible' ? 'text-emerald-600' : 'text-orange-600'
                            }`}>
                            {eligibilityResult.status}
                        </Text>
                    </View>
                )}
            </View>

            <View className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <Text className="text-lg font-semibold text-blue-900 mb-2">Property Tax Reminder</Text>
                <Text className="text-blue-700 text-sm mb-3">
                    Don't forget to pay your property tax before the due date to avoid penalties.
                </Text>
                <TouchableOpacity className="bg-blue-200 p-2 rounded-lg items-center">
                    <Text className="text-blue-800 font-medium">Set Reminder</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderReceipts = () => (
        <View className="space-y-6">
            <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Generate Rent Receipt</Text>
                <TextInput
                    placeholder="Tenant Name"
                    value={tenantName}
                    onChangeText={setTenantName}
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TextInput
                    placeholder="Rent Amount (₹)"
                    value={currentRent}
                    onChangeText={setCurrentRent}
                    keyboardType="numeric"
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TextInput
                    placeholder="Month (e.g., January 2024)"
                    value={receiptMonth}
                    onChangeText={setReceiptMonth}
                    className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3"
                />
                <TouchableOpacity
                    onPress={generateReceipt}
                    className="bg-teal-600 p-3 rounded-lg items-center"
                >
                    <Text className="text-white font-semibold">Generate Receipt</Text>
                </TouchableOpacity>

                {receiptGenerated && (
                    <View className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg mt-4 border-dashed border-2">
                        <Text className="text-center font-bold text-lg mb-2 text-gray-800">RENT RECEIPT</Text>
                        <Text className="text-gray-700 mb-1">Received sum of <Text className="font-bold">₹{currentRent}</Text></Text>
                        <Text className="text-gray-700 mb-1">From <Text className="font-bold">{tenantName}</Text></Text>
                        <Text className="text-gray-700 mb-1">For rent of <Text className="font-bold">{receiptMonth}</Text></Text>
                        <Text className="text-right text-gray-500 text-xs mt-4">Signed (Landlord)</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <View className="bg-white pt-12 pb-4 px-4 shadow-sm z-10">
                <View className="flex-row items-center space-x-3 mb-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-gray-100">
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-gray-900">Property & Assets</Text>
                        <Text className="text-sm text-gray-500">Manage your long-term wealth</Text>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
                    {[
                        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
                        { id: 'planning', label: 'Rent vs Buy', icon: Calculator },
                        { id: 'loans', label: 'Loans & Tax', icon: Home },
                        { id: 'receipts', label: 'Receipts', icon: FileText },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id)}
                            className={`flex-row items-center space-x-2 px-4 py-2 rounded-full ${activeTab === tab.id ? 'bg-blue-600' : 'bg-gray-100'
                                }`}
                        >
                            <tab.icon size={16} color={activeTab === tab.id ? 'white' : '#4B5563'} />
                            <Text className={`${activeTab === tab.id ? 'text-white' : 'text-gray-600'} font-medium`}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
                {activeTab === 'maintenance' && renderMaintenance()}
                {activeTab === 'planning' && renderPlanning()}
                {activeTab === 'loans' && renderLoans()}
                {activeTab === 'receipts' && renderReceipts()}
            </ScrollView>
        </View>
    );
}
