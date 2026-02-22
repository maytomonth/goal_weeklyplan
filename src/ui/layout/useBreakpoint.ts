import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  return { width, isDesktop };
}
