/**
 * A rounded, bordered "panel" that mimics a boxed terminal region, with an
 * optional title chip that sits on the top border (like the reference UI).
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, font } from '../theme/terminal';

type Props = {
  children?: React.ReactNode;
  title?: string;
  titleColor?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function TerminalFrame({ children, title, titleColor, color, style, contentStyle }: Props) {
  return (
    <View style={[styles.frame, color ? { borderColor: color } : null, style]}>
      {title ? (
        <View style={styles.titleWrap}>
          <Text style={[styles.title, titleColor ? { color: titleColor } : null]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.panel,
  },
  content: {
    padding: 12,
  },
  titleWrap: {
    position: 'absolute',
    top: -9,
    left: 14,
    paddingHorizontal: 6,
    backgroundColor: colors.panel,
    zIndex: 2,
  },
  title: {
    fontFamily: font.family,
    fontSize: font.xs,
    color: colors.textDim,
    letterSpacing: 1,
  },
});
