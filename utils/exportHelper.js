import { Platform } from 'react-native';

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Desired filename without extension
 */
export const exportToCSV = async (data, filename = 'export') => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // 1. Convert to CSV String
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row => headers.map(fieldName => {
            let value = row[fieldName];
            // Handle commas in strings
            if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    // 2. Handle Platform Specifics
    if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return true;
        }
    } else {
        // Native fallback (Mock for now as we couldn't install libraries)
        console.log('Native export not available without expo-file-system');
        // In a real scenario, we would try-catch import expo-file-system here
        alert('Export is currently supported on Web only in this environment.');
        return false;
    }
};
