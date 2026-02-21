import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type ToastTone = 'info' | 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastState {
  message: string;
  tone: ToastTone;
}

const TONE_COLORS: Record<ToastTone, string> = {
  info: '#1f2937',
  success: '#0f766e',
  error: '#b91c1c',
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      setToast({ message, tone });
      opacity.stopAnimation();
      opacity.setValue(0);

      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setToast(null);
      });
    },
    [opacity],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.overlay}>
          <Animated.View style={[styles.toast, { backgroundColor: TONE_COLORS[toast.tone], opacity }]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  toast: {
    maxWidth: '90%',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
  },
});
