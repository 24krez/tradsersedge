import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type LaunchIntroScreenProps = {
  isReady: boolean;
  onComplete: () => void;
};

const introIcon = require('../../assets/images/TradersEdge_appicon.png');

export function LaunchIntroScreen({ isReady, onComplete }: LaunchIntroScreenProps) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.85)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setReduceMotion((current) => current ?? false);
    }, 150);

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;

    const iconAnimation = reduceMotion
      ? Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      : Animated.parallel([
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1,
            friction: 7,
            tension: 55,
            useNativeDriver: true,
          }),
        ]);

    Animated.sequence([
      iconAnimation,
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(reduceMotion ? 120 : 260),
    ]).start(() => setAnimationComplete(true));
  }, [iconOpacity, iconScale, reduceMotion, subtitleOpacity, titleOpacity]);

  useEffect(() => {
    if (!animationComplete || !isReady) return;

    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(onComplete);
  }, [animationComplete, isReady, onComplete, screenOpacity]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar style="light" />
      <View style={styles.brandMark}>
        <Animated.View
          style={[
            styles.iconFrame,
            {
              opacity: iconOpacity,
              transform: [{ scale: reduceMotion ? 1 : iconScale }],
            },
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={introIcon}
            style={styles.icon}
          />
        </Animated.View>
      </View>

      <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
        TRADER'S EDGE
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Discipline before execution.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#080d0f',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brandMark: {
    alignItems: 'center',
    height: 220,
    justifyContent: 'center',
    marginBottom: 28,
    width: 220,
  },
  iconFrame: {
    alignItems: 'center',
    height: 190,
    justifyContent: 'center',
    width: 190,
  },
  icon: {
    height: '100%',
    width: '100%',
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    lineHeight: 30,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#d9c59d',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
});
