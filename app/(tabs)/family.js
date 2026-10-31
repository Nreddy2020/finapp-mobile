import React from 'react';
import { Redirect } from 'expo-router';

/**
 * app/(tabs)/family.js
 * 
 * Entry point redirect for FinLife Family Operating System.
 * Redirects seamlessly to the authoritative Expo Router route /family.
 * 
 * Invariants:
 * 1. Single authoritative navigation state (no duplicate tabs).
 * 2. Avoids mounting Family navigation shell inside the bottom tabs container.
 * 3. Preserves root application tab structure and avoids redirect loops.
 */
export default function FamilyTabRedirect() {
    return <Redirect href="/family" />;
}
