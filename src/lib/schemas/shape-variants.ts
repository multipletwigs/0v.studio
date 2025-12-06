import { z } from 'zod';

// tldraw color options
const colorSchema = z.enum([
  'black', 'grey', 'light-violet', 'violet', 'blue',
  'light-blue', 'yellow', 'orange', 'green', 'light-green',
  'light-red', 'red', 'white'
]);

// tldraw geo types for mid-fi mockups
const geoTypeSchema = z.enum([
  'rectangle', 'ellipse', 'triangle', 'diamond', 'pentagon',
  'hexagon', 'octagon', 'star', 'rhombus', 'rhombus-2',
  'oval', 'trapezoid', 'arrow-right', 'arrow-left',
  'arrow-up', 'arrow-down', 'x-box', 'check-box', 'cloud', 'heart'
]);

// Geo shape schema (rectangles, circles, etc.)
// Note: AI outputs 'text' as string, we transform to 'richText' when creating shapes
const geoShapeSchema = z.object({
  type: z.literal('geo'),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  props: z.object({
    w: z.number().min(1),
    h: z.number().min(1),
    geo: geoTypeSchema.default('rectangle'),
    color: colorSchema.default('black'),
    labelColor: colorSchema.default('black'),
    fill: z.enum(['none', 'semi', 'solid', 'pattern']).default('none'),
    dash: z.enum(['draw', 'solid', 'dashed', 'dotted']).default('solid'),
    size: z.enum(['s', 'm', 'l', 'xl']).default('m'),
    font: z.enum(['draw', 'sans', 'serif', 'mono']).default('sans'),
    align: z.enum(['start', 'middle', 'end']).default('middle'),
    verticalAlign: z.enum(['start', 'middle', 'end']).default('middle'),
    text: z.string().default(''), // AI outputs plain text, transformed to richText
    url: z.string().default(''),
    growY: z.number().default(0),
    scale: z.number().default(1),
  }),
});

// Text shape schema
// Note: AI outputs 'text' as string, we transform to 'richText' when creating shapes
// tldraw v4 uses 'textAlign' not 'align'
const textShapeSchema = z.object({
  type: z.literal('text'),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  props: z.object({
    w: z.number().min(1),
    color: colorSchema.default('black'),
    size: z.enum(['s', 'm', 'l', 'xl']).default('m'),
    font: z.enum(['draw', 'sans', 'serif', 'mono']).default('sans'),
    textAlign: z.enum(['start', 'middle', 'end']).default('start'),
    text: z.string(), // AI outputs plain text, transformed to richText
    autoSize: z.boolean().default(true),
    scale: z.number().default(1),
  }),
});

// Draw shape schema (freehand drawings)
// Segments contain arrays of points that form the path
const drawShapeSchema = z.object({
  type: z.literal('draw'),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  props: z.object({
    color: colorSchema.default('black'),
    dash: z.enum(['draw', 'solid', 'dashed', 'dotted']).default('draw'),
    size: z.enum(['s', 'm', 'l', 'xl']).default('m'),
    fill: z.enum(['none', 'semi', 'solid', 'pattern']).default('none'),
    segments: z.array(
      z.object({
        type: z.enum(['free', 'straight']).default('free'),
        points: z.array(
          z.object({
            x: z.number(),
            y: z.number(),
            z: z.number().default(0.5), // pressure
          })
        ),
      })
    ),
    isClosed: z.boolean().default(false),
    isComplete: z.boolean().default(true),
    scale: z.number().default(1),
  }),
});

// Arrow shape schema
// Arrows connect two points and can have labels
const arrowShapeSchema = z.object({
  type: z.literal('arrow'),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  props: z.object({
    color: colorSchema.default('black'),
    dash: z.enum(['draw', 'solid', 'dashed', 'dotted']).default('draw'),
    size: z.enum(['s', 'm', 'l', 'xl']).default('m'),
    fill: z.enum(['none', 'semi', 'solid', 'pattern']).default('none'),
    arrowheadStart: z.enum(['none', 'arrow', 'triangle', 'square', 'dot', 'diamond', 'inverted', 'bar', 'pipe']).default('none'),
    arrowheadEnd: z.enum(['none', 'arrow', 'triangle', 'square', 'dot', 'diamond', 'inverted', 'bar', 'pipe']).default('arrow'),
    start: z.object({
      x: z.number(),
      y: z.number(),
    }),
    end: z.object({
      x: z.number(),
      y: z.number(),
    }),
    bend: z.number().default(0),
    text: z.string().default(''), // Label on the arrow
    labelPosition: z.number().min(0).max(1).default(0.5),
    font: z.enum(['draw', 'sans', 'serif', 'mono']).default('draw'),
    scale: z.number().default(1),
  }),
});

// Union of supported shape types
export const shapeSchema = z.discriminatedUnion('type', [
  geoShapeSchema,
  textShapeSchema,
  drawShapeSchema,
  arrowShapeSchema,
]);

// A single variant containing multiple shapes
export const variantSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  shapes: z.array(shapeSchema),
  offset: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

// Complete AI response schema (single refined mockup)
export const variantsResponseSchema = z.object({
  variants: z.array(variantSchema).min(1).max(1),
});

// Type exports
export type GeoShape = z.infer<typeof geoShapeSchema>;
export type TextShape = z.infer<typeof textShapeSchema>;
export type DrawShape = z.infer<typeof drawShapeSchema>;
export type ArrowShape = z.infer<typeof arrowShapeSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type VariantsResponse = z.infer<typeof variantsResponseSchema>;
