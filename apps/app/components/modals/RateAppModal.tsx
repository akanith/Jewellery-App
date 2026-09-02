import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';
import { Star, X, CheckCircle, Heart } from 'lucide-react-native';

interface RateAppModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RateAppModal({ visible, onClose }: RateAppModalProps) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFeedback('');
        onClose();
      }, 1800);
    }, 600);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <View style={styles.iconCircle}>
                <Star size={18} color="#F59E0B" fill="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Rate Our App</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isSubmitted ? (
            <View style={styles.successContainer}>
              <Heart size={48} color="#7A0C2E" fill="#7A0C2E" style={{ marginBottom: 12 }} />
              <Text style={styles.successTitle}>Thank You!</Text>
              <Text style={styles.successSub}>
                Your feedback helps us make Ramya's Jeweller even better for your savings journey.
              </Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.questionText}>
                Enjoying your Jewellery Savings Scheme experience?
              </Text>

              {/* 5-Star Row */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((starIndex) => (
                  <TouchableOpacity
                    key={starIndex}
                    onPress={() => setRating(starIndex)}
                    style={styles.starTouch}
                    activeOpacity={0.7}
                  >
                    <Star
                      size={32}
                      color={starIndex <= rating ? '#F59E0B' : '#CBD5E1'}
                      fill={starIndex <= rating ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingHint}>
                {rating === 5 ? '⭐⭐⭐⭐⭐ Excellent!' : rating >= 4 ? 'Great Experience' : 'Thanks for your feedback'}
              </Text>

              {/* Feedback Input */}
              <Text style={styles.inputLabel}>Write a review (optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Share your thoughts about our app..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={feedback}
                onChangeText={setFeedback}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Rating</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 4,
  },
  formContainer: {
    alignItems: 'center',
  },
  questionText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starTouch: {
    padding: 4,
  },
  ratingHint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A0C2E',
    marginBottom: 16,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  textArea: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    textAlignVertical: 'top',
    height: 80,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#7A0C2E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
  },
});
