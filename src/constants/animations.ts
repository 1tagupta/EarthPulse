import { Variants } from 'framer-motion';

export const ANIMATIONS = {
  slowFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 1.5, ease: 'easeInOut' } },
  } as Variants,

  slideUpFade: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { delay: 2.5, duration: 2, ease: 'easeOut' } },
  } as Variants,
};
