'use client';

import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Layout';
import { cx, type KitBaseProps, type KitDataAttrs } from './base';
import { colorVar, type KitColor } from './tokens';

interface StatTileProps extends KitBaseProps<HTMLDivElement>, KitDataAttrs {
  label: string;
  value: string | number;
  /** Small delta line under the value, e.g. "↑ 32 this month". */
  delta?: string;
  /** Color of the value (and delta if no deltaColor). */
  color?: KitColor;
  deltaColor?: KitColor;
}

/**
 * Single metric tile — Astryx `Card` + typography. Used inside <KpiStrip>.
 */
export function StatTile({ label, value, delta, color = 'text', deltaColor, className, style, ref, ...rest }: StatTileProps) {
  return (
    <div ref={ref} className={cx(className)} style={style} {...rest}>
      <Card>
        <VStack gap={1}>
          <Text type="supporting" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, fontWeight: 700 }}>
            {label}
          </Text>
          <div style={{ color: colorVar(color), fontSize: '1.875rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {value}
          </div>
          {delta ? (
            <Text type="supporting" style={{ color: colorVar(deltaColor ?? 'success'), fontSize: 10, fontWeight: 700 }}>
              {delta}
            </Text>
          ) : null}
        </VStack>
      </Card>
    </div>
  );
}
