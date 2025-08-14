/**
 * Utility functions for detecting device type and capabilities
 */

export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for touch capability - desktop users typically don't have touch
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size - desktop typically has larger screens
  const hasLargeScreen = window.innerWidth >= 1024;
  
  // Check user agent for mobile/tablet indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  // Consider it desktop if it has a large screen, no touch, and not mobile UA
  return hasLargeScreen && !hasTouch && !isMobileUA;
};

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
};

export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isLargeTouch = hasTouch && window.innerWidth >= 768 && window.innerWidth < 1024;
  
  return isLargeTouch || /ipad|tablet/i.test(userAgent);
};

export const supportsFileDownload = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check if browser supports file downloads
  const link = document.createElement('a');
  return typeof link.download !== 'undefined';
};

export const getDeviceType = (): 'desktop' | 'tablet' | 'mobile' => {
  if (isDesktop()) return 'desktop';
  if (isTablet()) return 'tablet';
  return 'mobile';
};
