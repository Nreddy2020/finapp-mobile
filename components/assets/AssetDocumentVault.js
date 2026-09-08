/**
 * components/assets/AssetDocumentVault.js
 * 
 * FinLife Assets Module — Document Vault View.
 * Matching Screen 6 in mockup media_1788794817378.jpg.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { FileText, ChevronRight, Plus } from 'lucide-react-native';
import { getDocumentsViewModel } from './assetPresentationAdapter.js';

export default function AssetDocumentVault({ documents = getDocumentsViewModel(), onAddDocument, onSelectDocument }) {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Asset Documents</Text>
                <Text style={styles.countBadge}>{documents.length} Files</Text>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {documents.map((doc) => (
                    <TouchableOpacity 
                        key={doc.id}
                        style={styles.docCard}
                        onPress={() => onSelectDocument && onSelectDocument(doc)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconBox}>
                            <FileText size={20} color="#8B5CF6" />
                        </View>
                        <View style={styles.infoCol}>
                            <Text style={styles.docTitle}>{doc.title}</Text>
                            <Text style={styles.docSubtitle}>{doc.assetName} • {doc.date} • {doc.fileType}</Text>
                        </View>
                        <ChevronRight size={18} color="#6B7280" />
                    </TouchableOpacity>
                ))}

                {/* Add Document Button */}
                <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={onAddDocument}
                    activeOpacity={0.8}
                >
                    <Plus size={18} color="#10B981" />
                    <Text style={styles.addBtnText}>Add Document</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800'
    },
    countBadge: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600'
    },
    list: {
        flex: 1
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 30
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14
    },
    infoCol: {
        flex: 1
    },
    docTitle: {
        color: '#F9FAFB',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2
    },
    docSubtitle: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500'
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 10
    },
    addBtnText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '700'
    }
});
