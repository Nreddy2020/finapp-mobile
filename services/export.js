import { Alert } from 'react-native';
import { loadData, saveData, STORAGE_KEYS } from './storage';

/**
 * Export Service
 * Handles bulk operations and data export
 */

/**
 * Bulk upload documents from array
 */
export const bulkUploadDocuments = async (documents) => {
    try {
        if (!Array.isArray(documents) || documents.length === 0) {
            Alert.alert('Invalid Data', 'No documents to upload');
            return false;
        }

        // Validate each document
        const validDocuments = documents.filter(doc => {
            return doc.item && doc.expiry_date && doc.category;
        });

        if (validDocuments.length === 0) {
            Alert.alert('Invalid Data', 'No valid documents found');
            return false;
        }

        // Load existing documents
        const existingDocs = await loadData(STORAGE_KEYS.VALIDITY, []);

        // Add IDs and timestamps to new documents
        const newDocuments = validDocuments.map((doc, index) => ({
            ...doc,
            id: `doc_${Date.now()}_${index}`,
            created_at: new Date().toISOString(),
        }));

        // Merge with existing
        const allDocuments = [...newDocuments, ...existingDocs];

        // Save
        await saveData(STORAGE_KEYS.VALIDITY, allDocuments);

        Alert.alert(
            'Success',
            `Successfully uploaded ${newDocuments.length} document(s)`
        );

        return true;
    } catch (error) {
        console.error('Bulk upload error:', error);
        Alert.alert('Error', 'Failed to upload documents: ' + error.message);
        return false;
    }
};

/**
 * Export validity documents to CSV format
 */
export const exportToCSV = async () => {
    try {
        const documents = await loadData(STORAGE_KEYS.VALIDITY, []);

        if (documents.length === 0) {
            Alert.alert('No Data', 'No documents to export');
            return null;
        }

        // CSV header
        const headers = ['Item', 'Category', 'Expiry Date', 'Days Left', 'Created At'];
        const csvHeader = headers.join(',');

        // CSV rows
        const csvRows = documents.map(doc => {
            return [
                `"${doc.item || ''}"`,
                `"${doc.category || ''}"`,
                `"${doc.expiry_date || ''}"`,
                doc.days_left || 0,
                `"${doc.created_at || ''}"`
            ].join(',');
        });

        // Combine
        const csvContent = [csvHeader, ...csvRows].join('\n');

        // Try to share using expo-sharing
        try {
            const FileSystem = await import('expo-file-system').catch(() => null);
            const Sharing = await import('expo-sharing').catch(() => null);

            if (FileSystem && Sharing) {
                const fileName = `validity_export_${new Date().toISOString().split('T')[0]}.csv`;
                const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

                await FileSystem.writeAsStringAsync(fileUri, csvContent);

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(fileUri, {
                        mimeType: 'text/csv',
                        dialogTitle: 'Export Validity Documents',
                        UTI: 'public.comma-separated-values-text'
                    });
                    return fileUri;
                }
            }
        } catch (shareError) {
            console.log('Sharing not available, showing data:', shareError);
        }

        // Fallback: show alert with data
        Alert.alert(
            'Export Data',
            `${documents.length} documents ready to export.\n\nInstall expo-file-system and expo-sharing to save as CSV file.`,
            [{ text: 'OK' }]
        );

        return csvContent;
    } catch (error) {
        console.error('Export error:', error);
        Alert.alert('Error', 'Failed to export: ' + error.message);
        return null;
    }
};

/**
 * Export cashbooks to CSV format
 */
export const exportCashbooksToCSV = async () => {
    try {
        const cashbooks = await loadData(STORAGE_KEYS.CASHBOOKS, []);

        if (cashbooks.length === 0) {
            Alert.alert('No Data', 'No cashbooks to export');
            return null;
        }

        // CSV header
        const headers = ['Name', 'Type', 'Balance', 'Currency', 'Total In', 'Total Out', 'Last Updated'];
        const csvHeader = headers.join(',');

        // CSV rows
        const csvRows = cashbooks.map(book => {
            return [
                `"${book.name || ''}"`,
                `"${book.type || ''}"`,
                book.balance || 0,
                `"${book.currency || '₹'}"`,
                book.total_in || 0,
                book.total_out || 0,
                `"${book.last_updated || ''}"`
            ].join(',');
        });

        // Combine
        const csvContent = [csvHeader, ...csvRows].join('\n');

        // Try to share
        try {
            const FileSystem = await import('expo-file-system').catch(() => null);
            const Sharing = await import('expo-sharing').catch(() => null);

            if (FileSystem && Sharing) {
                const fileName = `cashbooks_export_${new Date().toISOString().split('T')[0]}.csv`;
                const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

                await FileSystem.writeAsStringAsync(fileUri, csvContent);

                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(fileUri, {
                        mimeType: 'text/csv',
                        dialogTitle: 'Export Cashbooks',
                        UTI: 'public.comma-separated-values-text'
                    });
                    return fileUri;
                }
            }
        } catch (shareError) {
            console.log('Sharing not available:', shareError);
        }

        // Fallback
        Alert.alert(
            'Export Data',
            `${cashbooks.length} cashbooks ready to export.\n\nInstall expo-file-system and expo-sharing to save as CSV file.`,
            [{ text: 'OK' }]
        );

        return csvContent;
    } catch (error) {
        console.error('Export error:', error);
        Alert.alert('Error', 'Failed to export: ' + error.message);
        return null;
    }
};
