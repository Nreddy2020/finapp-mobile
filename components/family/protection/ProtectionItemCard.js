import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
    FileCheck, 
    Shield, 
    UserCheck, 
    FileText, 
    MapPin, 
    Building2, 
    Edit2, 
    Archive, 
    Trash2 
} from 'lucide-react-native';
import { ProtectionType, ProtectionStatus } from '../../../services/family/familyContracts.js';

/**
 * ProtectionItemCard
 * 
 * Displays a critical protection directive (Healthcare Proxy, Will/Trust, POA, Guardianship),
 * its designated primary and backup agents, canonical physical safe location,
 * and linked document records.
 */
export default function ProtectionItemCard({
    item,
    onEdit,
    onArchive,
    onDelete
}) {
    if (!item) return null;

    const isArchived = item.status === ProtectionStatus.ARCHIVED;

    const getTypeDetails = (type) => {
        switch (type) {
            case ProtectionType.HEALTHCARE_PROXY:
                return { label: 'Healthcare Proxy', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
            case ProtectionType.WILL_TRUST:
                return { label: 'Will & Trust', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };
            case ProtectionType.POWER_OF_ATTORNEY:
                return { label: 'Power of Attorney', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
            case ProtectionType.GUARDIANSHIP_DECLARATION:
                return { label: 'Guardianship', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' };
            case ProtectionType.LIFE_INSURANCE_RECORD:
                return { label: 'Life Record Audit', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
            case ProtectionType.CRITICAL_DIRECTIVE:
            default:
                return { label: 'Critical Directive', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' };
        }
    };

    const getStatusDetails = (status) => {
        switch (status) {
            case ProtectionStatus.ACTIVE:
                return { label: 'ACTIVE', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
            case ProtectionStatus.IN_REVIEW:
                return { label: 'IN REVIEW', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
            case ProtectionStatus.DRAFT:
                return { label: 'DRAFT', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
            case ProtectionStatus.ARCHIVED:
            default:
                return { label: 'ARCHIVED', color: '#71717A', bg: '#27272A' };
        }
    };

    const typeInfo = getTypeDetails(item.protectionType);
    const statusInfo = getStatusDetails(item.status);

    return (
        <View style={[styles.card, isArchived && styles.cardArchived]}>
            {/* Top row: Type and Status badges */}
            <View style={styles.topRow}>
                <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
                    <Shield size={11} color={typeInfo.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.typeText, { color: typeInfo.color }]}>
                        {typeInfo.label}
                    </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                    </Text>
                </View>
            </View>

            {/* Title & Subject */}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subjectText}>
                Subject: {item.subjectPersonName || 'Household-Wide'}
            </Text>

            {/* Issuer / Institution if present */}
            {item.institutionOrIssuer ? (
                <View style={styles.metaRow}>
                    <Building2 size={12} color="#71717A" />
                    <Text style={styles.metaText}>{item.institutionOrIssuer}</Text>
                    {item.externalReferenceNumber ? (
                        <Text style={styles.refText}>• Ref: {item.externalReferenceNumber}</Text>
                    ) : null}
                </View>
            ) : null}

            {/* Designated Agents */}
            <View style={styles.agentBox}>
                <View style={styles.agentItem}>
                    <UserCheck size={12} color="#38BDF8" />
                    <Text style={styles.agentLabel}>Lead Agent:</Text>
                    <Text style={[styles.agentValue, !item.designatedPersonName && styles.unassigned]}>
                        {item.designatedPersonName || 'Unassigned'}
                    </Text>
                </View>

                {item.designatedBackupPersonName ? (
                    <View style={styles.agentItem}>
                        <Shield size={12} color="#A78BFA" />
                        <Text style={styles.agentLabel}>Successor:</Text>
                        <Text style={styles.agentValue}>{item.designatedBackupPersonName}</Text>
                    </View>
                ) : null}
            </View>

            {/* Linked Document & Physical Location */}
            <View style={styles.attributesRow}>
                {item.linkedDocumentTitle ? (
                    <View style={styles.attributePill}>
                        <FileText size={11} color="#60A5FA" />
                        <Text style={styles.attributeText} numberOfLines={1}>
                            {item.linkedDocumentTitle}
                        </Text>
                    </View>
                ) : null}

                {item.physicalLocation ? (
                    <View style={styles.attributePillLocation}>
                        <MapPin size={11} color="#34D399" />
                        <Text style={styles.attributeTextLocation} numberOfLines={1}>
                            {item.physicalLocation}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Notes */}
            {item.notes ? (
                <Text style={styles.notesText} numberOfLines={2}>
                    {item.notes}
                </Text>
            ) : null}

            {/* Action buttons footer */}
            <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => onEdit && onEdit(item)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Edit protection item"
                >
                    <Edit2 size={13} color="#94A3B8" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>

                {!isArchived && onArchive && (
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => onArchive(item)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Archive protection item"
                    >
                        <Archive size={13} color="#F59E0B" />
                        <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Archive</Text>
                    </TouchableOpacity>
                )}

                {onDelete && (
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => onDelete(item)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Delete protection item"
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
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    typeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4
    },
    subjectText: {
        color: '#A1A1AA',
        fontSize: 12,
        marginBottom: 8
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8
    },
    metaText: {
        color: '#71717A',
        fontSize: 12
    },
    refText: {
        color: '#71717A',
        fontSize: 12
    },
    agentBox: {
        backgroundColor: '#09090B',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 10,
        gap: 6
    },
    agentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    agentLabel: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600'
    },
    agentValue: {
        color: '#E4E4E7',
        fontSize: 12,
        fontWeight: '600'
    },
    unassigned: {
        color: '#71717A',
        fontStyle: 'italic'
    },
    attributesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10
    },
    attributePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 5,
        maxWidth: '100%'
    },
    attributeText: {
        color: '#93C5FD',
        fontSize: 11,
        fontWeight: '500'
    },
    attributePillLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 5,
        maxWidth: '100%'
    },
    attributeTextLocation: {
        color: '#6EE7B7',
        fontSize: 11,
        fontWeight: '500'
    },
    notesText: {
        color: '#71717A',
        fontSize: 11,
        lineHeight: 15,
        marginBottom: 10
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
