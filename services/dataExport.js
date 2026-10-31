import { Alert } from 'react-native';
import { ComplianceService } from './compliance.js';
export const exportUserData = async () => {
    const result = await ComplianceService.exportUserData();
    if (!result.success) Alert.alert('Export failed', result.error || 'Please retry.');
    return result;
};
