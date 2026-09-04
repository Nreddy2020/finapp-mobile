import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const mockModulePath = path.resolve(process.cwd(), 'tests', 'mock_rn_module.mjs');
const mockRnUrl = pathToFileURL(mockModulePath).href;

register(`data:text/javascript,
export async function resolve(specifier, context, nextResolve) {
    if (
        specifier === 'react-native' ||
        specifier === '@react-native-async-storage/async-storage' ||
        specifier === 'expo-file-system/legacy' ||
        specifier === 'expo-crypto' ||
        specifier === 'expo-modules-core' ||
        specifier === 'expo-secure-store'
    ) {
        return { shortCircuit: true, url: '${mockRnUrl}' };
    }
    if (specifier.startsWith('.')) {
        let target = specifier;
        if (!target.endsWith('.js') && !target.endsWith('.mjs')) {
            target = target + '.js';
        }
        const resolvedUrl = new URL(target, context.parentURL).href;
        return { shortCircuit: true, url: resolvedUrl };
    }
    return nextResolve(specifier, context);
}
`);
