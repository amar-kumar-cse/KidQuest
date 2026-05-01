import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';

interface LogoProps {
  width?: number;
  height?: number;
  showText?: boolean;
  showTagline?: boolean;
}

export default function KidQuestLogo({ 
  width = 100, 
  height = 100, 
  showText = true,
  showTagline = true 
}: LogoProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Svg width={width} height={height} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="gradLeft" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFD700" stopOpacity="1" />
              <Stop offset="1" stopColor="#FFBA00" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="gradRight" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#87CEEB" stopOpacity="1" />
              <Stop offset="1" stopColor="#2AB8ED" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          {/* Shield Left - Yellow */}
          <Path 
            d="M 50 10 L 15 20 C 15 50 25 75 50 90 C 50 90 50 90 50 90 L 50 10 Z" 
            fill="none" 
            stroke="url(#gradLeft)" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Shield Right - Light Blue */}
          <Path 
            d="M 50 10 L 85 20 C 85 50 75 75 50 90" 
            fill="none" 
            stroke="url(#gradRight)" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Plant - Greenish/Yellowish base */}
          <Path 
            d="M 35 70 C 40 60 50 55 50 45" 
            fill="none" 
            stroke="#90EE90" 
            strokeWidth="4" 
            strokeLinecap="round" 
          />
          <Path 
            d="M 35 60 C 30 55 25 60 25 65 C 25 70 30 75 35 70 Z" 
            fill="#FFD700" 
          />
          <Path 
            d="M 45 55 C 40 45 45 35 55 40 C 60 45 55 55 45 55 Z" 
            fill="#87CEEB" 
          />
          
          {/* Rocket */}
          <G transform="translate(10, -10) rotate(15, 50, 50)">
            <Path 
              d="M 50 25 C 60 30 65 40 65 55 L 60 65 L 40 65 L 35 55 C 35 40 40 30 50 25 Z" 
              fill="#FFD700" 
            />
            {/* Rocket Tip */}
            <Path 
              d="M 50 25 C 55 28 58 32 60 38 L 40 38 C 42 32 45 28 50 25 Z" 
              fill="#87CEEB" 
            />
            {/* Rocket Window */}
            <Circle cx="50" cy="45" r="5" fill="#FFFFFF" />
            <Circle cx="50" cy="45" r="5" fill="none" stroke="#2AB8ED" strokeWidth="2" />
            {/* Rocket Fins Left */}
            <Path d="M 35 55 L 25 65 L 35 70 Z" fill="#2AB8ED" />
            {/* Rocket Fins Right */}
            <Path d="M 65 55 L 75 65 L 65 70 Z" fill="#2AB8ED" />
          </G>
        </Svg>
        
        {showText && (
          <View style={styles.textContainer}>
            <Text style={styles.textKid}>Kid</Text>
            <Text style={styles.textQuest}>Quest</Text>
          </View>
        )}
      </View>
      
      {showTagline && (
        <Text style={styles.tagline}>Your child's growth, our peace of mind.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  textKid: {
    fontSize: 42,
    fontWeight: '900',
    color: '#87CEEB', // Light Blue
    letterSpacing: -1,
  },
  textQuest: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFD700', // Yellow
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000080', // Dark Blue
    marginTop: 8,
  }
});
