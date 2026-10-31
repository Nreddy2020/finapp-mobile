import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { 
    Phone, 
    Mail, 
    User, 
    Heart, 
    ExternalLink, 
    Edit2, 
    Archive, 
    Trash2, 
    AlertCircle,
    FileText
} from 'lucide-react-native';
import { EmergencyContactType } from '../../../services/family/familyContracts.js';

/**
 * EmergencyContactCard
 * 
 * Displays an individual emergency contact, their dispatch priority order,
 * reference source (household member, trusted circle, or external third-party),
 * and direct communication actions.
 */
export default function EmergencyContactCard({
    contact,
    onEdit,
    onArchive,
    onDelete
}) {
    if (!contact) return null;

    const isPrimary = contact.priorityOrder === 1;
    const isArchived = Boolean(contact.isArchived);

    const getTypeLabel = (type) => {
        switch (type) {
            case EmergencyContactType.PRIMARY:
                return 'Primary Dispatch';
            case EmergencyContactType.SECONDARY:
                return 'Secondary Dispatch';
            case EmergencyContactType.MEDICAL_PROXY:
                return 'Medical Proxy';
            case EmergencyContactType.LEGAL_PROXY:
                return 'Legal Proxy';
            case EmergencyContactType.GUARDIAN:
                return 'Guardian';
            case EmergencyContactType.SERVICE_PROVIDER:
                return 'Service Provider';
            case EmergencyContactType.OTHER:
            default:
                return 'Emergency Contact';
        }
    };

    const handleCall = () => {
        if (contact.primaryPhone) {
            Linking.openURL(`tel:${contact.primaryPhone.replace(/\s+/g, '')}`).catch(() => {});
        }
    };

    return (
        <View style={[styles.card, isArchived && styles.cardArchived]}>
            {/* Top row: Priority badge and source tag */}
            <View style={styles.topRow}>
                <View style={styles.badgeGroup}>
                    <View style={[styles.priorityPill, isPrimary ? styles.primaryPriorityPill : styles.standardPriorityPill]}>
                        <Text style={[styles.priorityText, isPrimary ? styles.primaryPriorityText : styles.standardPriorityText]}>
                            #{contact.priorityOrder} {getTypeLabel(contact.contactType)}
                        </Text>
                    </View>

                    {contact.isInternalMember && (
                        <View style={styles.sourcePillMember}>
                            <User size={10} color="#38BDF8" />
                            <Text style={styles.sourceTextMember}>Family Member</Text>
                        </View>
                    )}

                    {contact.isTrustedCircle && (
                        <View style={styles.sourcePillTrusted}>
                            <Heart size={10} color="#F472B6" />
                            <Text style={styles.sourceTextTrusted}>Trusted Circle</Text>
                        </View>
                    )}

                    {contact.isExternalThirdParty && (
                        <View style={styles.sourcePillExternal}>
                            <ExternalLink size={10} color="#A1A1AA" />
                            <Text style={styles.sourceTextExternal}>External</Text>
                        </View>
                    )}
                </View>

                {isArchived && (
                    <View style={styles.archivedBadge}>
                        <Text style={styles.archivedText}>ARCHIVED</Text>
                    </View>
                )}
            </View>

            {/* Name & Relationship */}
            <View style={styles.nameRow}>
                <Text style={styles.displayName}>{contact.displayName}</Text>
                {contact.relationship ? (
                    <Text style={styles.relationship}>• {contact.relationship}</Text>
                ) : null}
            </View>

            {/* Phone numbers & comms */}
            <View style={styles.contactDetails}>
                <TouchableOpacity 
                    style={styles.phoneButton} 
                    onPress={handleCall}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${contact.displayName}`}
                >
                    <Phone size={14} color="#10B981" />
                    <Text style={styles.phoneText}>{contact.primaryPhone || 'No phone recorded'}</Text>
                </TouchableOpacity>

                {contact.secondaryPhone ? (
                    <View style={styles.secondaryPhoneRow}>
                        <Phone size={12} color="#71717A" />
                        <Text style={styles.secondaryPhoneText}>{contact.secondaryPhone} (Alt)</Text>
                    </View>
                ) : null}

                {contact.email ? (
                    <View style={styles.emailRow}>
                        <Mail size={12} color="#71717A" />
                        <Text style={styles.emailText}>{contact.email}</Text>
                    </View>
                ) : null}
            </View>

            {/* Emergency instructions / notes */}
            {contact.instructions ? (
                <View style={styles.instructionsBox}>
                    <FileText size={12} color="#A1A1AA" style={styles.instructionIcon} />
                    <Text style={styles.instructionsText} numberOfLines={2}>
                        {contact.instructions}
                    </Text>
                </View>
            ) : null}

            {/* Action buttons footer */}
            <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => onEdit && onEdit(contact)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Edit emergency contact"
                >
                    <Edit2 size={13} color="#94A3B8" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>

                {!isArchived && onArchive && (
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => onArchive(contact)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Archive emergency contact"
                    >
                        <Archive size={13} color="#F59E0B" />
                        <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Archive</Text>
                    </TouchableOpacity>
                )}

                {onDelete && (
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => onDelete(contact)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Delete emergency contact"
                    >
                        <Trash2 size={13} color="#EF4444" />
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 16,
        marginBottom: 12
    },
    cardArchived: {
        opacity: 0.6,
        borderColor: '#27272A'
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    badgeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6
    },
    priorityPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1
    },
    primaryPriorityPill: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)'
    },
    primaryPriorityText: {
        color: '#F87171',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    standardPriorityPill: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.4)'
    },
    standardPriorityText: {
        color: '#60A5FA',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    sourcePillMember: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4
    },
    sourceTextMember: {
        color: '#38BDF8',
        fontSize: 10,
        fontWeight: '600'
    },
    sourcePillTrusted: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(244, 114, 182, 0.12)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4
    },
    sourceTextTrusted: {
        color: '#F472B6',
        fontSize: 10,
        fontWeight: '600'
    },
    sourcePillExternal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(161, 161, 170, 0.12)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        gap: 4
    },
    sourceTextExternal: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '600'
    },
    archivedBadge: {
        backgroundColor: '#27272A',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    archivedText: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '700'
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8
    },
    displayName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    relationship: {
        color: '#A1A1AA',
        fontSize: 13,
        marginLeft: 6
    },
    contactDetails: {
        marginBottom: 10
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    phoneText: {
        color: '#34D399',
        fontSize: 14,
        fontWeight: '600'
    },
    secondaryPhoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2
    },
    secondaryPhoneText: {
        color: '#A1A1AA',
        fontSize: 12
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    emailText: {
        color: '#A1A1AA',
        fontSize: 12
    },
    instructionsBox: {
        flexDirection: 'row',
        backgroundColor: '#09090B',
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 10
    },
    instructionIcon: {
        marginRight: 6,
        marginTop: 2
    },
    instructionsText: {
        color: '#D4D4D8',
        fontSize: 11,
        lineHeight: 15,
        flex: 1
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 10
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    actionBtnText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
    }
});
