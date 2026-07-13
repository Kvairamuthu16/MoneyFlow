import { useWindowDimensions } from 'react-native';
import { isTabletWidth } from '../theme';

/** Simple width-based responsive helper: phone vs tablet layouts. */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = isTabletWidth(width);
  return {
    width,
    height,
    isTablet,
    // KPI/grid columns: 2 on phones, 4 on tablets so cards don't stretch too wide.
    kpiColumns: isTablet ? 4 : 2,
    contentMaxWidth: isTablet ? 720 : undefined
  };
}
