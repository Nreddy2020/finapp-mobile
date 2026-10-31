import * as LocalAuthentication from 'expo-local-authentication';
export async function authenticateFamilyDetails(auth = LocalAuthentication) {
    const level = await auth.getEnrolledLevelAsync();
    if (level === auth.SecurityLevel.NONE) throw new Error('Set up a screen lock or biometrics in device settings before showing sensitive details.');
    const result = await auth.authenticateAsync({promptMessage:'Show family emergency details',cancelLabel:'Cancel',disableDeviceFallback:false});
    return result.success === true;
}
